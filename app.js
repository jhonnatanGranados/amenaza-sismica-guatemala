import { SOILS, createCatalog, reportValues } from './catalog.js';

const element = id => document.getElementById(id);
const views = ['department', 'municipality', 'soil', 'result'];
const state = { view: 'department', department: '', municipality: null, soil: '' };
let catalog;

function node(tag, text, className) {
  const value = document.createElement(tag);
  if (text !== undefined) value.textContent = text;
  if (className) value.className = className;
  return value;
}

function municipalityName(row) {
  return row[2] ?? `Sin nombre · registro ${row[0]}`;
}

function showView(view, focus = true) {
  if (!views.includes(view) || (view !== 'department' && !state.department)
    || (['soil', 'result'].includes(view) && !state.municipality)
    || (view === 'result' && !SOILS.includes(state.soil))) return;

  state.view = view;
  document.body.dataset.view = view;
  for (const name of views) element(`${name}View`).hidden = name !== view;
  element('reset').hidden = view === 'department';
  element('viewNav').hidden = view === 'department';
  element('context').textContent = state.department || 'Guatemala';
  element('soilSelect').value = state.soil;

  const title = {
    department: ['Elige un departamento', 'Busca por nombre o consulta el directorio.'],
    municipality: ['Elige un municipio', state.department],
    soil: ['Tipo de suelo', state.municipality ? municipalityName(state.municipality) : ''],
    result: ['Resultado de la consulta', ''],
  }[view];
  element('viewTitle').textContent = title[0];
  element('viewDescription').textContent = title[1];

  if (focus) {
    const target = ['department', 'municipality'].includes(view) ? element(`${view}Search`)
      : element(view === 'soil' ? 'soilSelect' : 'resultTitle');
    target.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function renderDepartments() {
  const matches = catalog.findDepartments(element('departmentSearch').value);
  const fragment = document.createDocumentFragment();
  for (const department of matches) {
    const button = node('button', undefined, 'directory-entry');
    button.type = 'button';
    button.dataset.department = department;
    button.append(node('span', department, 'entry-name'));
    const count = node('span', undefined, 'entry-count');
    count.append(node('b', catalog.count(department)), node('small', 'municipios'));
    button.append(count);
    fragment.append(button);
  }
  if (!matches.length) fragment.append(node('p', 'No hay departamentos con ese nombre.', 'empty-state'));
  element('departmentList').replaceChildren(fragment);
  element('departmentCount').textContent = `${matches.length} de ${catalog.departments.length}`;
}

function renderMunicipalities() {
  const matches = catalog.findMunicipalities(state.department, element('municipalitySearch').value);
  const fragment = document.createDocumentFragment();
  for (const row of matches) {
    const button = node('button', undefined, 'municipality-entry');
    button.type = 'button';
    button.dataset.municipality = row[0];
    button.append(node('span', municipalityName(row)), node('small', 'Elegir'));
    fragment.append(button);
  }
  if (!matches.length) fragment.append(node('p', 'No hay municipios con ese nombre en este departamento.', 'empty-state'));
  element('municipalityList').replaceChildren(fragment);
  element('municipalityCount').textContent = `${matches.length} de ${catalog.count(state.department)}`;
}

function chooseDepartment(department) {
  if (!catalog.departments.includes(department)) return;
  state.department = department;
  state.municipality = null;
  state.soil = '';
  element('municipalitySearch').value = '';
  element('reportBody').replaceChildren();
  renderMunicipalities();
  showView('municipality');
}

function chooseMunicipality(id) {
  const row = catalog.getRecord(state.department, id);
  if (!row) return;
  state.municipality = row;
  state.soil = '';
  element('reportBody').replaceChildren();
  showView('soil');
}

function chooseSoil(soil) {
  if (!state.municipality || !SOILS.includes(soil)) return;
  state.soil = soil;
  const row = node('tr');
  for (const value of reportValues(state.municipality, soil)) row.append(node('td', value ?? 'Sin dato'));
  element('reportBody').replaceChildren(row);
  element('soilHeading').textContent = `Suelo tipo ${soil}`;
  element('reportCaption').textContent = `${state.department}, ${municipalityName(state.municipality)}, suelo ${soil}`;
  showView('result');
}

function reset() {
  state.department = '';
  state.municipality = null;
  state.soil = '';
  element('departmentSearch').value = '';
  element('municipalitySearch').value = '';
  element('municipalityList').replaceChildren();
  element('reportBody').replaceChildren();
  renderDepartments();
  showView('department');
}

function back() {
  if (state.view === 'result') {
    state.soil = '';
    showView('soil');
  } else if (state.view === 'soil') {
    state.municipality = null;
    renderMunicipalities();
    showView('municipality');
  } else {
    state.department = '';
    state.municipality = null;
    state.soil = '';
    element('reportBody').replaceChildren();
    showView('department');
  }
}

// Each control has one handler. Navigation and data selection share one state.
element('departmentSearch').addEventListener('input', renderDepartments);
element('municipalitySearch').addEventListener('input', renderMunicipalities);
element('departmentList').addEventListener('click', event => {
  const button = event.target.closest('button[data-department]');
  if (button) chooseDepartment(button.dataset.department);
});
element('municipalityList').addEventListener('click', event => {
  const button = event.target.closest('button[data-municipality]');
  if (button) chooseMunicipality(button.dataset.municipality);
});
element('soilList').addEventListener('click', event => {
  const button = event.target.closest('button[data-soil]');
  if (button) chooseSoil(button.dataset.soil);
});
element('soilSelect').addEventListener('change', event => chooseSoil(event.target.value));
for (const name of ['department', 'municipality']) {
  element(`${name}Search`).addEventListener('keydown', event => {
    const buttons = element(`${name}List`).querySelectorAll('button');
    if (event.key === 'ArrowDown' && buttons.length) { event.preventDefault(); buttons[0].focus(); }
    if (event.key === 'Enter' && buttons.length === 1) { event.preventDefault(); buttons[0].click(); }
  });
}
element('back').addEventListener('click', back);
element('reset').addEventListener('click', reset);
element('retry').addEventListener('click', load);

const soilFragment = document.createDocumentFragment();
for (const soil of SOILS) {
  const option = node('option', soil);
  option.value = soil;
  element('soilSelect').append(option);
  const button = node('button', undefined, 'soil-entry');
  button.type = 'button';
  button.dataset.soil = soil;
  button.append(node('span', 'Suelo'), node('strong', soil), node('small', 'Consultar parámetros'));
  soilFragment.append(button);
}
element('soilList').replaceChildren(soilFragment);

async function load() {
  element('consultation').hidden = true;
  element('loadStatus').hidden = false;
  element('loadStatus').textContent = 'Cargando el catálogo municipal…';
  element('retry').hidden = true;
  try {
    const response = await fetch('data/municipios.json');
    if (!response.ok) throw new Error('No se pudo abrir el catálogo.');
    catalog = createCatalog(await response.json());
    renderDepartments();
    element('loadStatus').hidden = true;
    element('consultation').hidden = false;
    showView('department', false);
  } catch {
    element('loadStatus').textContent = 'No se pudo cargar el catálogo. Intenta de nuevo.';
    element('retry').hidden = false;
  }
}

load();

