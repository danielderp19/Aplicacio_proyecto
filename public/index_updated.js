// ── RENDERIZAR FORMULARIO REACTIVO ──
function renderFormulario(emp){
  document.getElementById('emp-card').innerHTML = `
    <div class="emp-card">
      <p><strong>Nombre:</strong> ${emp['Primer nombre']} ${emp['Segundo nombre']||''} ${emp['Primer apellido']} ${emp['Segundo apellido']||''}</p>
      <p><strong>Cédula:</strong> ${emp['Numero documento empleado']} &nbsp;·&nbsp; <strong>Cargo:</strong> ${emp['Cargo']} &nbsp;·&nbsp; <strong>Área:</strong> ${emp['Area']}</p>
      <p><strong>Ciudad:</strong> ${emp['Nombre ciudad']||'—'} &nbsp;·&nbsp; <strong>Dirección:</strong> ${emp['Direccion']||'—'}</p>
    </div>`;

  const body = document.getElementById('form-body');
  body.innerHTML='';

  // 1. PERSONALES (REACTIVO)
  const pf=[
    falta(emp,'Fecha nacimiento') && fd('Fecha nacimiento','Fecha de Nacimiento',true),
    falta(emp,'Grupo sanguineno') && fs('Grupo sanguineno','Tipo de Sangre (R.H.)',['O+','O-','A+','A-','B+','B-','AB+','AB-'],true),
    falta(emp,'Estado civil') && fs('Estado civil','Estado Civil',['Soltero/a','Casado/a','Unión Libre','Separado/a','Viudo/a','Divorciado/a'],true),
    falta(emp,'Barrio') && ft('Barrio','Barrio de residencia',true),
    falta(emp,'Numero telefono') && ft('Numero telefono','Teléfono fijo',true),
  ].filter(Boolean);
  if(pf.length) body.appendChild(seccion('👤 Datos Personales',`<div class="grid2">${pf.join('')}</div>`));

  // 2. VEHÍCULO Y VIVIENDA (REACTIVO)
  const vf=[
    falta(emp,'Licencia conduccion') && ft('Licencia conduccion','Licencia de Conducción',false),
    falta(emp,'Categoria licencia') && ft('Categoria licencia','Categoría (A1, B1, C1...)',false),
    falta(emp,'No moto') && ft('No moto','No. Moto (placa)',false),
    falta(emp,'No carro') && ft('No carro','No. Carro (placa)',false),
  ].filter(Boolean);
  const hasVeh = vf.length > 0 || falta(emp,'Vehiculo propio') || falta(emp,'Vivienda propia');
  if(hasVeh){
    let vContent = '';
    if(vf.length) vContent += `<div class="grid2">${vf.join('')}</div>`;
    if(falta(emp,'Vehiculo propio')) vContent += `
      <div style="padding:12px 0;border-top:1px solid #eee">
        <label>¿Vehículo propio? *</label>
        <div class="radio-group">
          <label><input type="radio" name="Vehiculo propio" value="Si" required> Sí</label>
          <label><input type="radio" name="Vehiculo propio" value="No"> No</label>
        </div>
      </div>`;
    if(falta(emp,'Vivienda propia')) vContent += `
      <div style="padding:12px 0;">
        <label>¿Vivienda propia? *</label>
        <div class="radio-group">
          <label><input type="radio" name="Vivienda propia" value="Si" required> Sí</label>
          <label><input type="radio" name="Vivienda propia" value="No"> No</label>
        </div>
      </div>`;
    body.appendChild(seccion('🚗 Vehículo y Vivienda',vContent));
  }

  // 3. CAJA DE COMPENSACIÓN (REACTIVO)
  if(falta(emp,'Caja de compensacion')){
    body.appendChild(seccion('🏢 Caja de Compensación',
      fs('Caja de compensacion','Caja de Compensación Familiar',['Compensar','Cafam','Colsubsidio','Comfama','Comfenalco','Comfandi','Comfacor','Comfaboy','Otra'],true)
    ));
  }

  // 4. BANCO (REACTIVO)
  const bf=[
    falta(emp,'Codigo banco') && fs('Codigo banco','Banco *',['BANCOLOMBIA','BANCO DE BOGOTÁ','BANCO OCCIDENTE','BANCO DAVIVIENDA','BANCO ITAÚ','SCOTIABANK','CITIBANK','BANCO CAJA SOCIAL','BANCO AGRARIO','BANCO FALABELLA','BANCO PICHINCHA','BANCO AV VILLAS','BANCO ANDRÉS','OTRO'],true),
    falta(emp,'Tipo cuenta') && fs('Tipo cuenta','Tipo de Cuenta *',['Cuenta de ahorros','Cuenta corriente','Ahorros en USD'],true),
    falta(emp,'# Cuenta bancaria') && ft('# Cuenta bancaria','Número de Cuenta *',true),
  ].filter(Boolean);
  if(bf.length) body.appendChild(seccion('🏦 Información Bancaria',`<div class="grid2">${bf.join('')}</div>`));

  // 5. FINANCIERO
  body.appendChild(seccion('💰 Información Financiera',`
    <div class="grid3">
      <div class="fg"><label>Otros Ingresos <span class="opt">$/mes</span></label><input type="number" name="Otros ingresos" placeholder="0" min="0"></div>
      <div class="fg"><label>Activos <span class="opt">$ total</span></label><input type="number" name="Activos" placeholder="0" min="0"></div>
      <div class="fg"><label>Pasivos <span class="opt">$ total</span></label><input type="number" name="Pasivos" placeholder="0" min="0"></div>
    </div>`));

  // 6. MONEDA EXTRANJERA
  body.appendChild(seccion('💱 Operaciones en Moneda Extranjera',`
    <div class="fg">
      <label>¿Realiza operaciones en moneda extranjera? *</label>
      <div class="radio-group">
        <label><input type="radio" name="Operaciones moneda extranjera" value="Si" onclick="document.getElementById('sub-moneda').classList.add('show')"> Sí</label>
        <label><input type="radio" name="Operaciones moneda extranjera" value="No" onclick="document.getElementById('sub-moneda').classList.remove('show')" checked> No</label>
      </div>
    </div>
    <div class="sub-form" id="sub-moneda">
      <div class="grid2">
        ${ft('Cuales operaciones moneda','¿Cuáles operaciones?',false)}
        <div class="fg"><label>¿Posee cuentas en moneda extranjera?</label>
          <div class="radio-group">
            <label><input type="radio" name="Cuentas moneda extranjera" value="Si"> Sí</label>
            <label><input type="radio" name="Cuentas moneda extranjera" value="No"> No</label>
          </div>
        </div>
        ${ft('No cuenta moneda extranjera','N° de cuenta',false)}
        ${ft('Banco moneda extranjera','Banco',false)}
        ${ft('Ciudad moneda extranjera','Ciudad',false)}
        ${ft('Pais moneda extranjera','País',false)}
        ${ft('Tipo moneda extranjera','Moneda (USD, EUR...)',false)}
      </div>
    </div>`));

  // 7. FAMILIA Y EMERGENCIAS
  body.appendChild(seccion('👨‍👩‍👧 Estado Civil, Familia y Emergencias',`
    <div class="grid2">
      <div class="fg full">${ft('Nombre conyuge','Apellidos y nombres del cónyuge',false)}</div>
      <div class="fg"><label>N° de Hijos <span class="opt">(opcional)</span></label><input type="number" name="Numero hijos" placeholder="0" min="0" max="20"></div>
      <div class="fg full" style="border-top:1px solid #eee;padding-top:12px"><label><strong>Contacto de emergencia</strong></label></div>
      <div class="fg full">${ft('Nombre contacto emergencia','Nombre completo *',true)}</div>
      ${ft('Telefono contacto emergencia','Teléfono *',true)}
      ${fs('Parentesco contacto emergencia','Parentesco *',['Cónyuge','Madre','Padre','Hermano/a','Hijo/a','Amigo/a','Otro'],true)}
    </div>`));

  // 8. EDUCACIÓN
  body.appendChild(seccion('🎓 Nivel Educativo',`
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:grid;grid-template-columns:140px 1fr;gap:10px;align-items:center">
        <label style="display:flex;align-items:center;gap:6px;font-weight:400"><input type="checkbox" name="nivel_bachillerato" value="Si" style="width:auto"> Bachillerato</label>
        <input type="text" name="entidad_bachillerato" placeholder="Institución educativa">
      </div>
      ${['tecnico','tecnologico','universitario','postgrado'].map(n=>`
      <div style="display:grid;grid-template-columns:140px 1fr 1fr;gap:10px;align-items:center">
        <label style="display:flex;align-items:center;gap:6px;font-weight:400"><input type="checkbox" name="nivel_${n}" value="Si" style="width:auto"> ${n.charAt(0).toUpperCase()+n.slice(1)}</label>
        <input type="text" name="titulo_${n}" placeholder="Título obtenido">
        <input type="text" name="entidad_${n}" placeholder="Institución">
      </div>`).join('')}
      <label style="display:flex;align-items:center;gap:6px;font-weight:400"><input type="checkbox" name="nivel_otros" value="Si" style="width:auto"> Otros</label>
    </div>`));

  document.getElementById('step1').classList.remove('active');
  document.getElementById('step2').classList.add('active');
  document.getElementById('frm').onsubmit = guardarDatos;
  document.getElementById('form-body').innerHTML+=
    '<div class="warn-box">⚠️ Completa los campos con * y los que apliquen a tu situación.</div>';
}
