"use strict";(()=>{var e={};e.id=338,e.ids=[338],e.modules={2934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8137:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>g,patchFetch:()=>h,requestAsyncStorage:()=>m,routeModule:()=>l,serverHooks:()=>x,staticGenerationAsyncStorage:()=>_});var a={};r.r(a),r.d(a,{GET:()=>p});var o=r(3277),n=r(5265),s=r(5356),i=r(7076),d=r(8824),c=r(1220);let u=["paid","preparing","ready"];async function p(){let e;let t=await (0,d.j)();try{e=await (0,c.C)(t)}catch{return i.NextResponse.json({error:"N\xe3o autenticado"},{status:401})}let{data:r,error:a}=await t.from("pedidos").select(`
      id,
      order_number,
      status,
      modalidade,
      cliente_nome,
      cliente_telefone,
      endereco_rua,
      endereco_numero,
      endereco_bairro,
      endereco_cidade,
      endereco_cep,
      endereco_complemento,
      subtotal,
      taxa_entrega,
      pricing_mode,
      zone_name,
      distance_km,
      estimated_delivery_minutes,
      total,
      criado_em,
      atualizado_em,
      itens_pedido (
        id,
        nome_snapshot,
        quantidade,
        subtotal
      )
    `).eq("restaurante_id",e).in("status",u).order("criado_em",{ascending:!1});return a?(console.error("[GET /api/admin/pedidos] erro:",a),i.NextResponse.json({error:"Erro ao buscar pedidos"},{status:500})):i.NextResponse.json({pedidos:r??[]})}let l=new o.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/admin/pedidos/route",pathname:"/api/admin/pedidos",filename:"route",bundlePath:"app/api/admin/pedidos/route"},resolvedPagePath:"C:\\Users\\israe\\Desktop\\evo-claude-system\\web\\src\\app\\api\\admin\\pedidos\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:m,staticGenerationAsyncStorage:_,serverHooks:x}=l,g="/api/admin/pedidos/route";function h(){return(0,s.patchFetch)({serverHooks:x,staticGenerationAsyncStorage:_})}},1220:(e,t,r)=>{r.d(t,{C:()=>a});async function a(e){let{data:{user:t}}=await e.auth.getUser();if(!t)throw Error("N\xe3o autenticado");let{data:r,error:a}=await e.from("restaurant_users").select("restaurante_id").eq("user_id",t.id).single();if(a||!r)throw Error("Restaurante n\xe3o encontrado para este usu\xe1rio");return r.restaurante_id}},8824:(e,t,r)=>{r.d(t,{j:()=>n});var a=r(403),o=r(6701);async function n(){let e=await (0,o.cookies)();return(0,a.createServerClient)(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:a})=>e.set(t,r,a))}catch{}}}})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[942,662,786,769],()=>r(8137));module.exports=a})();