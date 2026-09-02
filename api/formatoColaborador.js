const path = require('path');
const ExcelJS = require('exceljs');
const JSZip = require('jszip');

const TEMPLATE_PATH = path.join(__dirname, '../templates/formato_colaboradores.xlsx');

function value(datos, ...keys) {
  for (const key of keys) {
    const v = datos?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function splitDate(input) {
  const raw = value({ input }, 'input');
  if (!raw) return ['', '', ''];
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return [iso[3], iso[2], iso[1]];
  const latam = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (latam) return [latam[1].padStart(2, '0'), latam[2].padStart(2, '0'), latam[3]];
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return [
      String(d.getUTCDate()).padStart(2, '0'),
      String(d.getUTCMonth() + 1).padStart(2, '0'),
      String(d.getUTCFullYear()),
    ];
  }
  return ['', '', ''];
}

function fullName(datos) {
  return [
    value(datos, 'Primer apellido'),
    value(datos, 'Segundo apellido'),
    value(datos, 'Primer nombre'),
    value(datos, 'Segundo nombre'),
  ].filter(Boolean).join(' ');
}

function set(ws, cell, val) {
  if (val !== undefined && val !== null && String(val).trim() !== '') ws.getCell(cell).value = val;
}

function mark(ws, condition, cell) {
  if (condition) ws.getCell(cell).value = 'X';
}

function hasEducationLevel(datos, level, ...aliases) {
  const direct = normalize(value(datos, `nivel_${level}`));
  const summary = normalize(value(datos, 'nivel_educativo', 'Nivel educativo', 'Nivel Educativo'));
  return direct.startsWith('si') || [level, ...aliases].some((term) => summary.includes(normalize(term)));
}

function fillFormatSheet(ws, datos) {
  const [birthDay, birthMonth, birthYear] = splitDate(value(datos, 'Fecha nacimiento'));
  const [startDay, startMonth, startYear] = splitDate(value(datos, 'Fecha inicio contrato'));
  const today = new Date();
  const docType = normalize(value(datos, 'Tipo documento empleado')) === '13' ? 'cc' : normalize(value(datos, 'Tipo documento empleado'));
  const gender = normalize(value(datos, 'Genero'));
  const civil = normalize(value(datos, 'Estado civil'));
  const accountType = normalize(value(datos, 'Tipo cuenta'));
  const hasVehicle = normalize(value(datos, 'Vehiculo propio', 'Vehículo propio'));
  const hasHouse = normalize(value(datos, 'Vivienda propia'));
  const foreignOps = normalize(value(datos, 'Operaciones moneda extranjera'));
  const foreignAccounts = normalize(value(datos, 'Cuentas moneda extranjera'));

  set(ws, 'AJ5', String(today.getDate()).padStart(2, '0'));
  set(ws, 'AL5', String(today.getMonth() + 1).padStart(2, '0'));
  set(ws, 'AN5', String(today.getFullYear()));

  set(ws, 'I9', fullName(datos));
  set(ws, 'I10', value(datos, 'Direccion', 'Dirección'));
  set(ws, 'AG10', value(datos, 'Barrio'));
  mark(ws, hasHouse.startsWith('si'), 'I11');
  mark(ws, hasHouse.startsWith('no'), 'K11');
  set(ws, 'P11', value(datos, 'Telefono fijo', 'Numero telefono'));
  set(ws, 'X11', value(datos, 'Celular', 'Numero telefono'));
  set(ws, 'AI11', value(datos, 'Nombre ciudad', 'Ciudad'));

  set(ws, 'H12', value(datos, 'Licencia conduccion', 'Licencia de Conducción'));
  set(ws, 'N12', value(datos, 'No moto'));
  set(ws, 'X12', value(datos, 'No carro'));
  set(ws, 'AF12', value(datos, 'Categoria licencia'));
  mark(ws, hasVehicle.startsWith('si'), 'AN12');
  mark(ws, hasVehicle.startsWith('no'), 'AP12');

  mark(ws, docType === 'ti', 'H13');
  mark(ws, docType === 'cc' || docType === 'cedula', 'K13');
  mark(ws, docType === 'ce', 'N13');
  set(ws, 'Q13', value(datos, 'cedula', 'Numero documento empleado'));
  set(ws, 'Y13', value(datos, 'Nombre ciudad', 'Ciudad'));
  set(ws, 'AF13', value(datos, 'Nombre departamento'));
  set(ws, 'AM13', value(datos, 'Nombre ciudad'));

  set(ws, 'J14', birthDay);
  set(ws, 'L14', birthMonth);
  set(ws, 'N14', birthYear);
  mark(ws, gender === 'm' || gender === 'masculino', 'U14');
  mark(ws, gender === 'f' || gender === 'femenino', 'W14');
  set(ws, 'AD14', value(datos, 'Nombre pais', 'Nacionalidad'));
  set(ws, 'AM14', value(datos, 'Grupo sanguineno', 'Grupo sanguíneo', 'RH'));

  set(ws, 'G15', value(datos, 'Cargo'));
  set(ws, 'AA15', value(datos, 'Area', 'Área'));
  set(ws, 'M17', startDay);
  set(ws, 'P17', startMonth);
  set(ws, 'S17', startYear);
  set(ws, 'AC17', value(datos, 'Eps', 'EPS'));
  set(ws, 'AG18', value(datos, 'Fondo pensiones'));
  set(ws, 'G19', value(datos, '# Cuenta bancaria'));
  set(ws, 'T19', value(datos, 'Nombre banco'));
  set(ws, 'AE19', value(datos, 'Fondo cesantías'));
  set(ws, 'AE20', value(datos, 'Arl', 'ARP'));
  mark(ws, accountType.includes('ahorro'), 'E21');
  mark(ws, accountType.includes('corriente'), 'K21');
  set(ws, 'AH21', value(datos, 'Caja de compensacion'));

  set(ws, 'H23', value(datos, 'Otros ingresos'));
  set(ws, 'I24', value(datos, 'Activos'));
  set(ws, 'I25', value(datos, 'Pasivos'));
  mark(ws, foreignOps.startsWith('si'), 'S29');
  mark(ws, foreignOps.startsWith('no'), 'V29');
  set(ws, 'Y29', value(datos, 'Cuales operaciones moneda'));
  mark(ws, foreignAccounts.startsWith('si'), 'S31');
  mark(ws, foreignAccounts.startsWith('no'), 'V31');
  set(ws, 'Y33', value(datos, 'No cuenta moneda extranjera'));
  set(ws, 'Y34', value(datos, 'Banco moneda extranjera'));
  set(ws, 'Y35', value(datos, 'Ciudad moneda extranjera'));
  set(ws, 'AD35', value(datos, 'Pais moneda extranjera'));
  set(ws, 'Y36', value(datos, 'Tipo moneda extranjera'));

  mark(ws, civil.startsWith('s') || civil.includes('soltero'), 'M38');
  mark(ws, civil.startsWith('c') || civil.includes('casado'), 'T38');
  mark(ws, civil.startsWith('u') || civil.includes('union') || civil.includes('libre'), 'AA38');
  mark(ws, civil.includes('separado') || civil.includes('divorciado'), 'AI38');
  mark(ws, civil.includes('viudo'), 'AP38');
  set(ws, 'M39', value(datos, 'Nombre conyuge'));
  set(ws, 'AM39', value(datos, 'Numero hijos'));
  set(ws, 'M41', value(datos, 'Nombre contacto emergencia'));
  set(ws, 'AA41', value(datos, 'Telefono contacto emergencia'));
  set(ws, 'AL41', value(datos, 'Parentesco contacto emergencia'));

  fillEducation(ws, datos);
  fillBeneficiaries(ws, datos);
  set(ws, 'AC72', value(datos, 'cedula', 'Numero documento empleado'));
}

function fillEducation(ws, datos) {
  const bachillerato = {
    checked: hasEducationLevel(datos, 'bachillerato', 'bachiller'),
    entidad: value(datos, 'entidad_bachillerato'),
  };
  mark(ws, bachillerato.checked || !!bachillerato.entidad, 'I46');
  set(ws, 'N46', bachillerato.entidad);

  const rows = [
    ['tecnico', 47],
    ['tecnologico', 48],
    ['universitario', 49],
    ['postgrado', 50],
  ];
  for (const [level, row] of rows) {
    const tituloDirecto = value(datos, `titulo_${level}`);
    const entidad = value(datos, `entidad_${level}`);
    const aliases = level === 'tecnologico' ? ['tecnológico', 'tecnologo', 'tecnólogo'] : [];
    const checked = hasEducationLevel(datos, level, ...aliases);
    const titulo = tituloDirecto || (checked ? value(datos, 'titulo_obtenido', 'Título obtenido') : '');
    mark(ws, checked || !!titulo || !!entidad, `I${row}`);
    set(ws, `T${row}`, titulo);
    set(ws, `AH${row}`, entidad);
  }
  mark(ws, hasEducationLevel(datos, 'otros', 'otro'), 'I51');
}

function fillBeneficiaries(ws, datos) {
  for (let i = 1; i <= 5; i += 1) {
    const row = 58 + i;
    const [day, month, year] = splitDate(value(datos, `ben${i}_fnacimiento`));
    set(ws, `D${row}`, value(datos, `ben${i}_nombre`));
    set(ws, `L${row}`, value(datos, `ben${i}_apellido`));
    set(ws, `T${row}`, value(datos, `ben${i}_parentesco`));
    set(ws, `Y${row}`, day);
    set(ws, `AA${row}`, month);
    set(ws, `AC${row}`, year);
    set(ws, `AE${row}`, value(datos, `ben${i}_edad`));
    const education = normalize(value(datos, `ben${i}_educacion`));
    mark(ws, education.includes('escolar'), `AH${row}`);
    mark(ws, education.includes('primaria'), `AJ${row}`);
    mark(ws, education.includes('secundaria'), `AL${row}`);
    mark(ws, education.includes('universidad'), `AN${row}`);
  }
}

async function buildFormatoBuffer(datos) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  fillFormatSheet(workbook.getWorksheet('Formato Empleados'), datos);
  return workbook.xlsx.writeBuffer();
}

async function buildFormatosZip(records) {
  const zip = new JSZip();
  for (const record of records) {
    const datos = record.datos_completos || {};
    const buffer = await buildFormatoBuffer(datos);
    const cedula = value(datos, 'cedula', 'Numero documento empleado') || record.cedula || 'sin-cedula';
    const nombre = (record.nombre || fullName(datos) || 'colaborador')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50);
    zip.file(`${cedula}_${nombre}.xlsx`, buffer);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { buildFormatoBuffer, buildFormatosZip };
