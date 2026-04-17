"use strict";(()=>{var e={};e.id=589,e.ids=[589],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8997:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>c,patchFetch:()=>g,requestAsyncStorage:()=>m,routeModule:()=>p,serverHooks:()=>_,staticGenerationAsyncStorage:()=>l});var a={};r.r(a),r.d(a,{GET:()=>u});var s=r(3277),o=r(5265),n=r(5356),i=r(7076),d=r(240);async function u(e,{params:t}){let{searchParams:r}=new URL(e.url),a=r.get("telefone");if(!a)return i.NextResponse.json({error:"Par\xe2metro telefone obrigat\xf3rio"},{status:400});let s=a.replace(/\D/g,""),o=(0,d.eI)(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY),{data:n,error:u}=await o.from("pedidos").select(`
      id,
      order_number,
      status,
      modalidade,
      cliente_nome,
      total,
      taxa_entrega,
      pricing_mode,
      zone_name,
      distance_km,
      estimated_delivery_minutes,
      restaurantes ( nome ),
      itens_pedido ( nome_snapshot, quantidade, subtotal )
    `).eq("id",t.id).eq("cliente_telefone",s).maybeSingle();if(u)return console.error("[GET status] erro:",u),i.NextResponse.json({error:"Erro ao buscar pedido"},{status:500});if(!n)return i.NextResponse.json({error:"Pedido n\xe3o encontrado"},{status:404});let p=n.restaurantes,m=Array.isArray(n.itens_pedido)?n.itens_pedido.map(e=>({nome:e.nome_snapshot,quantidade:e.quantidade,subtotal:e.subtotal})):[];return i.NextResponse.json({id:n.id,order_number:n.order_number,status:n.status,modalidade:n.modalidade,cliente_nome:n.cliente_nome,total:n.total,taxa_entrega:n.taxa_entrega,pricing_mode:n.pricing_mode,zone_name:n.zone_name,distance_km:n.distance_km,estimated_delivery_minutes:n.estimated_delivery_minutes,restaurante_nome:p?.nome??"",itens:m})}let p=new s.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/pedidos/[id]/status/route",pathname:"/api/pedidos/[id]/status",filename:"route",bundlePath:"app/api/pedidos/[id]/status/route"},resolvedPagePath:"C:\\Users\\israe\\Desktop\\evo-claude-system\\web\\src\\app\\api\\pedidos\\[id]\\status\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:m,staticGenerationAsyncStorage:l,serverHooks:_}=p,c="/api/pedidos/[id]/status/route";function g(){return(0,n.patchFetch)({serverHooks:_,staticGenerationAsyncStorage:l})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[942,662,786],()=>r(8997));module.exports=a})();