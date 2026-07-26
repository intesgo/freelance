/* DOBLE DE PRUEBAS de supabase-js · solo para el visor de pantallas.
   Desde que se entra únicamente por el portal, las apps necesitan una sesión
   para mostrarse. Aquí se finge una sesión válida y una base que responde
   vacío: interesa cómo SE VE la app, no los datos. Nunca se publica. */
(function(){
  var USUARIO = { id:"visor-0001", email:"visor@pruebas.local" };
  var PADRON  = { usr_id:"FRL-RR", nombre:"Richard Ramírez", rol:"freelance", activo:true, prov_cod:null };
  function consulta(tabla){
    var filas = (tabla === "usuarios") ? [PADRON] : [];
    var p = Promise.resolve({ data: filas, error: null, count: 0 });
    ["select","eq","neq","in","order","limit","like","not","is","gte","lte","or","filter","range"]
      .forEach(function(m){ p[m] = function(){ return consulta(tabla); }; });
    p.maybeSingle = function(){ return Promise.resolve({ data: filas[0] || null, error: null }); };
    p.single = p.maybeSingle;
    p.insert = function(){ return Promise.resolve({ data:null, error:null }); };
    p.upsert = function(){ return Promise.resolve({ data:null, error:null }); };
    p.update = function(){ var q = Promise.resolve({ data:null, error:null });
      ["eq","in","is"].forEach(function(m){ q[m] = function(){ return q; }; }); return q; };
    p["delete"] = function(){ var q = Promise.resolve({ data:null, error:null });
      q.eq = function(){ return q; }; return q; };
    return p;
  }
  window.supabase = {
    createClient: function(){
      return {
        auth: {
          getSession: function(){ return Promise.resolve({ data:{ session:{ user:USUARIO } }, error:null }); },
          getUser:    function(){ return Promise.resolve({ data:{ user:USUARIO }, error:null }); },
          signInWithPassword: function(){ return Promise.resolve({ data:{ session:{ user:USUARIO } }, error:null }); },
          signOut:    function(){ return Promise.resolve({ error:null }); },
          updateUser: function(){ return Promise.resolve({ error:null }); },
          resetPasswordForEmail: function(){ return Promise.resolve({ error:null }); },
          onAuthStateChange: function(){ return { data:{ subscription:{ unsubscribe:function(){} } } }; }
        },
        from: consulta,
        rpc: function(){ return Promise.resolve({ data:null, error:null }); },
        channel: function(){ var c = { on:function(){ return c; }, subscribe:function(){ return c; } }; return c; },
        removeChannel: function(){},
        functions: { invoke: function(){ return Promise.resolve({ data:{}, error:null }); } },
        storage: { from: function(){ return {
          upload: function(){ return Promise.resolve({ data:null, error:null }); },
          createSignedUrl: function(){ return Promise.resolve({ data:null, error:null }); },
          remove: function(){ return Promise.resolve({ data:null, error:null }); } }; } }
      };
    }
  };
})();
