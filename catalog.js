export const SOILS = Object.freeze(['A', 'B', 'BC', 'C', 'CD', 'D', 'DE', 'E']);

export function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

export function createCatalog(payload) {
  if (!Array.isArray(payload?.rows) || payload.rows.length === 0) {
    throw new Error('El archivo no contiene registros municipales.');
  }

  const byDepartment = new Map();
  const byId = new Map();
  for (const source of payload.rows) {
    if (!Array.isArray(source) || source.length !== 29 || source[0] == null || !source[1]) {
      throw new Error('Hay un registro incompleto en el catálogo.');
    }
    const row = Object.freeze([...source]);
    const id = String(row[0]);
    if (byId.has(id)) throw new Error(`El registro ${id} está duplicado.`);
    byId.set(id, row);
    if (!byDepartment.has(row[1])) byDepartment.set(row[1], []);
    byDepartment.get(row[1]).push(row);
  }

  const compare = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
  const departments = Object.freeze([...byDepartment.keys()].sort(compare.compare));
  for (const rows of byDepartment.values()) {
    rows.sort((a, b) => compare.compare(a[2] ?? '', b[2] ?? ''));
    Object.freeze(rows);
  }

  return Object.freeze({
    size: byId.size,
    departments,
    count: department => byDepartment.get(department)?.length ?? 0,
    findDepartments: query => departments.filter(name => normalize(name).includes(normalize(query))),
    findMunicipalities: (department, query = '') => (byDepartment.get(department) ?? [])
      .filter(row => normalize(row[2]).includes(normalize(query))),
    getRecord(department, id) {
      const row = byId.get(String(id));
      return row?.[1] === department ? row : undefined;
    },
  });
}

export function reportValues(row, soil) {
  const index = SOILS.indexOf(soil);
  if (!row || row.length !== 29 || index < 0) throw new Error('Selecciona un municipio y un suelo válido.');
  return [row[0], row[1], row[2], row[3], ...row.slice(4 + index * 3, 7 + index * 3)];
}
