'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  fetchDeliveryCalculation,
  hasEnoughAddressData,
  initialCheckoutDeliveryState,
  type DeliveryAddressFormValues,
  type CheckoutDeliveryState,
} from '@/features/checkout/delivery'

interface UseCheckoutInput {
  modalidade: 'entrega' | 'retirada'
  restauranteId: string
  address: DeliveryAddressFormValues
  subtotal: number
}

export function useCheckout({
  modalidade,
  restauranteId,
  address,
  subtotal,
}: UseCheckoutInput) {
  const [delivery, setDelivery] = useState<CheckoutDeliveryState>(initialCheckoutDeliveryState)
  const [retryTick, setRetryTick] = useState(0)

  const retryDeliveryCalculation = useCallback(() => {
    setRetryTick((current) => current + 1)
  }, [])

  useEffect(() => {
    if (modalidade !== 'entrega') {
      setDelivery(initialCheckoutDeliveryState)
      return
    }

    if (!hasEnoughAddressData(address)) {
      setDelivery(initialCheckoutDeliveryState)
      return
    }

    const controller = new AbortController()
    let isStale = false

    setDelivery({
      ...initialCheckoutDeliveryState,
      loading: true,
    })

    const timer = window.setTimeout(async () => {
      try {
        const result = await fetchDeliveryCalculation({
          restaurantId: restauranteId,
          address,
          orderTotal: subtotal,
          signal: controller.signal,
        })

        if (isStale) {
          return
        }

        setDelivery({
          loading: false,
          deliveryFee: result.status === 'error' ? null : result.delivery_fee,
          distance: result.status === 'error' ? null : result.distance_km,
          estimatedDeliveryMinutes:
            result.status === 'error' ? null : result.estimated_delivery_minutes,
          pricingMode: result.status === 'error' ? null : result.pricing_mode,
          zoneName: result.status === 'error' ? null : result.zone_name ?? null,
          error:
            result.status === 'error'
              ? result.message ?? 'Não foi possível calcular a entrega'
              : null,
          outOfRange: result.status === 'out_of_range',
        })
      } catch (error) {
        if (controller.signal.aborted || isStale) {
          return
        }

        setDelivery({
          loading: false,
          deliveryFee: null,
          distance: null,
          estimatedDeliveryMinutes: null,
          pricingMode: null,
          zoneName: null,
          error:
            error instanceof Error
              ? error.message
              : 'Não foi possível calcular a entrega',
          outOfRange: false,
        })
      }
    }, 600)

    return () => {
      isStale = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [
    address.bairro,
    address.cidade,
    address.cep,
    address.numero,
    address.rua,
    modalidade,
    restauranteId,
    retryTick,
    subtotal,
  ])

  const requiresCalculatedDeliveryFee =
    modalidade === 'entrega' && hasEnoughAddressData(address)
  const canSubmit =
    modalidade === 'retirada' ||
    (!delivery.loading &&
      !delivery.outOfRange &&
      !delivery.error &&
      delivery.deliveryFee !== null)

  return {
    delivery,
    canSubmit,
    requiresCalculatedDeliveryFee,
    retryDeliveryCalculation,
  }
}
