import type { GridDiagramKind } from '../types/dsi';

function encodeSvgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

/**
 * Generates an accurate Archimedean spiral SVG path centered at (cx, cy).
 */
function buildArchimedeanSpiralPath(
  cx: number,
  cy: number,
  turns: number,
  startR: number,
  stepPerRadian: number
): string {
  const maxTheta = turns * Math.PI * 2;
  const steps = Math.round(turns * 48);
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const theta = (i / steps) * maxTheta;
    const r = startR + stepPerRadian * theta;
    // Start going up-left through Q1 -> Q2 -> Q3 -> Q4 clockwise
    const angle = -Math.PI + theta;
    const x = (cx + r * Math.cos(angle)).toFixed(1);
    const y = (cy + r * Math.sin(angle)).toFixed(1);
    points.push(`${i === 0 ? 'M' : 'L'}${x} ${y}`);
  }
  return points.join(' ');
}

const BOEHM_SPIRAL_PATH = buildArchimedeanSpiralPath(450, 300, 3.35, 14, 7.6);

/**
 * Generates crisp, self-contained 900x600 vector diagrams designed for CSS grid slicing.
 * Every grid boundary (1x4, 2x2, 3x2) avoids splitting text labels across seams while
 * using continuous lines/curves/branches across boundaries as visual alignment cues.
 */
export function getGridDiagramDataUri(kind?: GridDiagramKind): string {
  switch (kind) {
    case 'pressman_layers':
      // Designed for cols: 1, rows: 4 (each 900x150 horizontal band = 1 complete layer)
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
            <rect x="170" y="14" width="560" height="122" rx="18" fill="#0284C7" stroke="#0369A1" stroke-width="4"/>
            <text x="450" y="68" font-size="30" fill="#FFFFFF">HERRAMIENTAS (CASE)</text>
            <text x="450" y="106" font-size="18" fill="#E0F2FE" font-weight="600">Soporte automatizado para procesos y métodos</text>

            <rect x="120" y="164" width="660" height="122" rx="18" fill="#059669" stroke="#047857" stroke-width="4"/>
            <text x="450" y="218" font-size="30" fill="#FFFFFF">MÉTODOS (El Cómo)</text>
            <text x="450" y="256" font-size="18" fill="#D1FAE5" font-weight="600">Comunicación · Análisis · Diseño · Construcción · Pruebas</text>

            <rect x="70" y="314" width="760" height="122" rx="18" fill="#4F46E5" stroke="#3730A3" stroke-width="4"/>
            <text x="450" y="368" font-size="30" fill="#FFFFFF">PROCESO (El Qué)</text>
            <text x="450" y="406" font-size="18" fill="#E0E7FF" font-weight="600">Marco de trabajo y actividades sombrilla transversales</text>

            <rect x="28" y="464" width="844" height="122" rx="18" fill="#0F172A" stroke="#334155" stroke-width="4"/>
            <text x="450" y="518" font-size="30" fill="#FBBF24">COMPROMISO CON LA CALIDAD</text>
            <text x="450" y="556" font-size="18" fill="#CBD5E1" font-weight="600">Base fundacional de toda la Ingeniería de Software (Pressman)</text>
          </g>
        </svg>
      `);

    case 'waterfall_model':
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <g font-family="system-ui, sans-serif" font-weight="700">
            <rect x="45" y="45" width="240" height="86" rx="14" fill="#2563EB"/>
            <text x="165" y="96" font-size="22" fill="#FFF" text-anchor="middle">1. Requisitos</text>

            <path d="M285 88 L330 88 L330 170" fill="none" stroke="#1E293B" stroke-width="5"/>
            <rect x="195" y="148" width="240" height="86" rx="14" fill="#0891B2"/>
            <text x="315" y="199" font-size="22" fill="#FFF" text-anchor="middle">2. Diseño del SW</text>

            <path d="M435 191 L480 191 L480 273" fill="none" stroke="#1E293B" stroke-width="5"/>
            <rect x="345" y="251" width="240" height="86" rx="14" fill="#059669"/>
            <text x="465" y="302" font-size="22" fill="#FFF" text-anchor="middle">3. Implementación</text>

            <path d="M585 294 L630 294 L630 376" fill="none" stroke="#1E293B" stroke-width="5"/>
            <rect x="485" y="354" width="240" height="86" rx="14" fill="#D97706"/>
            <text x="605" y="405" font-size="22" fill="#FFF" text-anchor="middle">4. Verificación</text>

            <path d="M725 397 L760 397 L760 479" fill="none" stroke="#1E293B" stroke-width="5"/>
            <rect x="615" y="460" width="245" height="86" rx="14" fill="#7C3AED"/>
            <text x="737" y="511" font-size="22" fill="#FFF" text-anchor="middle">5. Mantenimiento</text>

            <path d="M485 397 C 320 440, 210 380, 140 245" fill="none" stroke="#64748B" stroke-width="4" stroke-dasharray="10 8"/>
            <text x="155" y="490" font-size="20" fill="#475569">Retroalimentación entre etapas</text>
          </g>
        </svg>
      `);

    case 'boehm_spiral':
      // Designed for cols: 2, rows: 2 — true centered Archimedean spiral + axes crossing (450, 300)
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <!-- Subtle quadrant background tints -->
          <rect x="16" y="16" width="428" height="278" rx="18" fill="#EFF6FF" stroke="#93C5FD" stroke-width="2.5"/>
          <rect x="456" y="16" width="428" height="278" rx="18" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="2.5"/>
          <rect x="456" y="306" width="428" height="278" rx="18" fill="#ECFDF5" stroke="#6EE7B7" stroke-width="2.5"/>
          <rect x="16" y="306" width="428" height="278" rx="18" fill="#FFFBEB" stroke="#FCD34D" stroke-width="2.5"/>

          <!-- Coordinate Axes passing straight through center (450, 300) -->
          <line x1="450" y1="14" x2="450" y2="586" stroke="#0F172A" stroke-width="3.5"/>
          <line x1="14" y1="300" x2="886" y2="300" stroke="#0F172A" stroke-width="3.5"/>
          <polygon points="450,6 443,20 457,20" fill="#0F172A"/>
          <polygon points="894,300 880,293 880,307" fill="#0F172A"/>

          <!-- Mathematically smooth Archimedean spiral centered at (450, 300) -->
          <path d="${BOEHM_SPIRAL_PATH}" fill="none" stroke="#1E293B" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="450" cy="300" r="7" fill="#2563EB"/>

          <!-- Quadrant Titles safely inside outer corners (never split across center seam) -->
          <g font-family="system-ui, sans-serif">
            <!-- Q1 Top-Left -->
            <text x="36" y="54" font-size="21" font-weight="800" fill="#1E3A8A">I. Fijar Objetivos</text>
            <text x="36" y="80" font-size="15" font-weight="600" fill="#1D4ED8">Alternativas y restricciones</text>

            <!-- Q2 Top-Right -->
            <text x="864" y="54" font-size="21" font-weight="800" fill="#991B1B" text-anchor="end">II. Análisis de Riesgos</text>
            <text x="864" y="80" font-size="15" font-weight="600" fill="#DC2626" text-anchor="end">Prototipos y evaluación</text>

            <!-- Q3 Bottom-Right -->
            <text x="864" y="542" font-size="21" font-weight="800" fill="#065F46" text-anchor="end">III. Desarrollar y Probar</text>
            <text x="864" y="568" font-size="15" font-weight="600" fill="#047857" text-anchor="end">Construcción e hito IOC</text>

            <!-- Q4 Bottom-Left -->
            <text x="36" y="542" font-size="21" font-weight="800" fill="#92400E">IV. Planificar Fase</text>
            <text x="36" y="568" font-size="15" font-weight="600" fill="#B45309">Revisión de hitos LCO / LCA</text>
          </g>
        </svg>
      `);

    case 'iterative_up':
      // Designed for cols: 2, rows: 2 — Iconic RUP 2D Humps matrix with continuous curves across x=450
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <!-- Phase columns background bands -->
          <rect x="20" y="20" width="205" height="560" rx="14" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="2"/>
          <rect x="235" y="20" width="205" height="560" rx="14" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="2"/>
          <rect x="460" y="20" width="205" height="560" rx="14" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="2"/>
          <rect x="675" y="20" width="205" height="560" rx="14" fill="#FFFBEB" stroke="#FDE68A" stroke-width="2"/>

          <!-- Phase headers (strictly top row, each inside its own column) -->
          <g font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle">
            <rect x="30" y="30" width="185" height="62" rx="12" fill="#0284C7"/>
            <text x="122" y="58" font-size="19" fill="#FFF">1. INICIO</text>
            <text x="122" y="80" font-size="13" fill="#E0F2FE" font-weight="600">Visión y alcance</text>

            <rect x="245" y="30" width="185" height="62" rx="12" fill="#4F46E5"/>
            <text x="337" y="58" font-size="19" fill="#FFF">2. ELABORACIÓN</text>
            <text x="337" y="80" font-size="13" fill="#E0E7FF" font-weight="600">Arquitectura base</text>

            <rect x="470" y="30" width="185" height="62" rx="12" fill="#059669"/>
            <text x="562" y="58" font-size="19" fill="#FFF">3. CONSTRUCCIÓN</text>
            <text x="562" y="80" font-size="13" fill="#D1FAE5" font-weight="600">Desarrollo funcional</text>

            <rect x="685" y="30" width="185" height="62" rx="12" fill="#D97706"/>
            <text x="777" y="58" font-size="19" fill="#FFF">4. TRANSICIÓN</text>
            <text x="777" y="80" font-size="13" fill="#FEF3C7" font-weight="600">Entrega al usuario</text>
          </g>

          <!-- Top-row continuous RUP Hump curves: Requisitos & Análisis y Diseño -->
          <path d="M35 200 C 120 115, 230 120, 340 160 C 450 190, 620 198, 865 200 L865 200 L35 200 Z" fill="#3B82F6" fill-opacity="0.28" stroke="#2563EB" stroke-width="3.5"/>
          <path d="M35 282 C 170 280, 260 195, 360 205 C 490 220, 640 278, 865 282 Z" fill="#6366F1" fill-opacity="0.28" stroke="#4F46E5" stroke-width="3.5"/>

          <g font-family="system-ui, sans-serif" font-weight="700" font-size="16">
            <text x="42" y="138" fill="#1E3A8A">Flujo: Requisitos</text>
            <text x="42" y="254" fill="#3730A3">Flujo: Análisis y Diseño</text>
            <text x="858" y="138" fill="#065F46" text-anchor="end">Cierre de requisitos</text>
            <text x="858" y="254" fill="#92400E" text-anchor="end">Refinamiento de diseño</text>
          </g>

          <!-- Bottom-row continuous RUP Hump curves: Implementación & Pruebas/Despliegue -->
          <path d="M35 425 C 220 425, 370 390, 490 335 C 585 295, 650 385, 865 425 Z" fill="#10B981" fill-opacity="0.30" stroke="#059669" stroke-width="3.5"/>
          <path d="M35 520 C 260 520, 410 495, 550 455 C 675 418, 760 415, 865 520 Z" fill="#F59E0B" fill-opacity="0.32" stroke="#D97706" stroke-width="3.5"/>

          <!-- Bottom milestone footer tags strictly inside left/right columns -->
          <g font-family="system-ui, sans-serif" font-weight="700">
            <text x="42" y="360" font-size="16" fill="#065F46">Flujo: Implementación</text>
            <text x="42" y="485" font-size="16" fill="#92400E">Flujos: Pruebas y Despliegue</text>
            <rect x="35" y="535" width="390" height="34" rx="8" fill="#0F172A"/>
            <text x="230" y="557" font-size="14" fill="#CBD5E1" text-anchor="middle">Hitos tempranos: LCO (Inicio) · LCA (Elaboración)</text>

            <text x="858" y="360" font-size="16" fill="#065F46" text-anchor="end">Pico de codificación</text>
            <text x="858" y="485" font-size="16" fill="#92400E" text-anchor="end">Validación y puesta en marcha</text>
            <rect x="475" y="535" width="390" height="34" rx="8" fill="#0F172A"/>
            <text x="670" y="557" font-size="14" fill="#34D399" text-anchor="middle">Hitos finales: IOC (Construcción) · Producto (Transición)</text>
          </g>
        </svg>
      `);

    case 'morville_ux':
      // Designed for cols: 3, rows: 2 (each cell is 300x300 = 1:1; zero label straddling seams)
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <!-- Radial connector spokes meeting at center (450, 300) -->
          <g stroke="#CBD5E1" stroke-width="5" stroke-linecap="round">
            <line x1="150" y1="150" x2="450" y2="300"/>
            <line x1="450" y1="150" x2="450" y2="300"/>
            <line x1="750" y1="150" x2="450" y2="300"/>
            <line x1="150" y1="450" x2="450" y2="300"/>
            <line x1="450" y1="450" x2="450" y2="300"/>
            <line x1="750" y1="450" x2="450" y2="300"/>
          </g>
          <!-- Center alignment ring at (450, 300) without split text -->
          <circle cx="450" cy="300" r="38" fill="#F59E0B" stroke="#92400E" stroke-width="5"/>
          <circle cx="450" cy="300" r="14" fill="#FEF3C7"/>

          <g font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle">
            <!-- Row 0 Col 0: (150, 150) -->
            <polygon points="150,36 248,93 248,207 150,264 52,207 52,93" fill="#10B981" stroke="#065F46" stroke-width="5"/>
            <text x="150" y="146" font-size="24" fill="#FFF">ÚTIL</text>
            <text x="150" y="176" font-size="14" fill="#ECFDF5" font-weight="600">Resuelve necesidad</text>

            <!-- Row 0 Col 1: (450, 150) -->
            <polygon points="450,36 548,93 548,207 450,264 352,207 352,93" fill="#0284C7" stroke="#075985" stroke-width="5"/>
            <text x="450" y="146" font-size="24" fill="#FFF">USABLE</text>
            <text x="450" y="176" font-size="14" fill="#E0F2FE" font-weight="600">Fácil de operar</text>

            <!-- Row 0 Col 2: (750, 150) -->
            <polygon points="750,36 848,93 848,207 750,264 652,207 652,93" fill="#6366F1" stroke="#3730A3" stroke-width="5"/>
            <text x="750" y="146" font-size="23" fill="#FFF">DESEABLE</text>
            <text x="750" y="176" font-size="14" fill="#E0E7FF" font-weight="600">Atractivo e identidad</text>

            <!-- Row 1 Col 0: (150, 450) -->
            <polygon points="150,336 248,393 248,507 150,564 52,507 52,393" fill="#0D9488" stroke="#115E59" stroke-width="5"/>
            <text x="150" y="446" font-size="20" fill="#FFF">ENCONTRABLE</text>
            <text x="150" y="476" font-size="14" fill="#CCFBF1" font-weight="600">Navegación clara</text>

            <!-- Row 1 Col 1: (450, 450) -->
            <polygon points="450,336 548,393 548,507 450,564 352,507 352,393" fill="#EC4899" stroke="#9D174D" stroke-width="5"/>
            <text x="450" y="446" font-size="22" fill="#FFF">ACCESIBLE</text>
            <text x="450" y="476" font-size="14" fill="#FCE7F3" font-weight="600">Inclusivo (WCAG)</text>

            <!-- Row 1 Col 2: (750, 450) -->
            <polygon points="750,336 848,393 848,507 750,564 652,507 652,393" fill="#8B5CF6" stroke="#5B21B6" stroke-width="5"/>
            <text x="750" y="446" font-size="23" fill="#FFF">CREÍBLE</text>
            <text x="750" y="476" font-size="14" fill="#EDE9FE" font-weight="600">Genera confianza</text>
          </g>
        </svg>
      `);

    case 'uml_views_4plus1':
      // Designed for cols: 2, rows: 2 — Kruchten 4+1 Views with geometric central Use-Case star hub at (450, 300)
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <!-- Diagonal arrows linking all 4 views to central +1 hub at (450, 300) -->
          <g stroke="#334155" stroke-width="4.5" stroke-linecap="round">
            <line x1="250" y1="185" x2="450" y2="300"/>
            <line x1="650" y1="185" x2="450" y2="300"/>
            <line x1="250" y1="415" x2="450" y2="300"/>
            <line x1="650" y1="415" x2="450" y2="300"/>
          </g>

          <!-- Clean central +1 diamond emblem (pure geometry, no chopped text) -->
          <polygon points="450,242 520,300 450,358 380,300" fill="#0F172A" stroke="#F59E0B" stroke-width="5"/>
          <circle cx="450" cy="300" r="18" fill="#F59E0B"/>

          <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
            <!-- Top-Left -->
            <rect x="28" y="28" width="384" height="196" rx="18" fill="#2563EB" stroke="#1D4ED8" stroke-width="4"/>
            <text x="220" y="96" font-size="26" fill="#FFF">Vista Lógica</text>
            <text x="220" y="132" font-size="17" fill="#DBEAFE" font-weight="600">Funcionalidad · Clases y Objetos</text>
            <text x="220" y="176" font-size="14" fill="#FEF08A">↳ Validada por +1 Escenarios</text>

            <!-- Top-Right -->
            <rect x="488" y="28" width="384" height="196" rx="18" fill="#059669" stroke="#047857" stroke-width="4"/>
            <text x="680" y="96" font-size="26" fill="#FFF">Vista de Desarrollo</text>
            <text x="680" y="132" font-size="17" fill="#D1FAE5" font-weight="600">Módulos · Componentes y Paquetes</text>
            <text x="680" y="176" font-size="14" fill="#FEF08A">↳ Validada por +1 Escenarios</text>

            <!-- Bottom-Left -->
            <rect x="28" y="376" width="384" height="196" rx="18" fill="#7C3AED" stroke="#6D28D9" stroke-width="4"/>
            <text x="220" y="444" font-size="26" fill="#FFF">Vista de Procesos</text>
            <text x="220" y="480" font-size="17" fill="#EDE9FE" font-weight="600">Concurrencia · Hilos y Sincronización</text>
            <text x="220" y="524" font-size="14" fill="#FEF08A">↳ Validada por +1 Escenarios</text>

            <!-- Bottom-Right -->
            <rect x="488" y="376" width="384" height="196" rx="18" fill="#D97706" stroke="#B45309" stroke-width="4"/>
            <text x="680" y="444" font-size="26" fill="#FFF">Vista Física</text>
            <text x="680" y="480" font-size="17" fill="#FEF3C7" font-weight="600">Despliegue · Nodos y Hardware</text>
            <text x="680" y="524" font-size="14" fill="#FEF08A">↳ Validada por +1 Escenarios</text>
          </g>
        </svg>
      `);

    case 'clean_architecture':
      // Designed for cols: 1, rows: 4 (each 900x150 horizontal band = 1 complete layer)
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
            <rect x="50" y="14" width="800" height="122" rx="18" fill="#0284C7" stroke="#0369A1" stroke-width="4"/>
            <text x="450" y="68" font-size="28" fill="#FFF">Capa de Presentación (UI / Vistas)</text>
            <text x="450" y="106" font-size="18" fill="#E0F2FE" font-weight="600">Interacción con usuario, endpoints y controladores</text>

            <rect x="50" y="164" width="800" height="122" rx="18" fill="#059669" stroke="#047857" stroke-width="4"/>
            <text x="450" y="218" font-size="28" fill="#FFF">Capa de Lógica de Negocio (Dominio)</text>
            <text x="450" y="256" font-size="18" fill="#D1FAE5" font-weight="600">Reglas del dominio, casos de uso y entidades</text>

            <rect x="50" y="314" width="800" height="122" rx="18" fill="#4F46E5" stroke="#3730A3" stroke-width="4"/>
            <text x="450" y="368" font-size="28" fill="#FFF">Capa de Persistencia / Datos</text>
            <text x="450" y="406" font-size="18" fill="#E0E7FF" font-weight="600">Repositorios, mapeo ORM y acceso a Base de Datos</text>

            <rect x="50" y="464" width="800" height="122" rx="18" fill="#0F172A" stroke="#334155" stroke-width="4"/>
            <text x="450" y="518" font-size="28" fill="#FBBF24">Infraestructura / Recursos Compartidos</text>
            <text x="450" y="556" font-size="18" fill="#CBD5E1" font-weight="600">Red, sistema operativo y servicios externos</text>
          </g>
        </svg>
      `);

    case 'scrum_cycle':
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
            <rect x="40" y="150" width="200" height="290" rx="18" fill="#1E293B"/>
            <text x="140" y="275" font-size="23" fill="#38BDF8">Product</text>
            <text x="140" y="308" font-size="23" fill="#38BDF8">Backlog</text>
            <text x="140" y="346" font-size="15" fill="#94A3B8">Product Owner</text>

            <rect x="275" y="65" width="210" height="130" rx="18" fill="#2563EB"/>
            <text x="380" y="122" font-size="22" fill="#FFF">Sprint Backlog</text>
            <text x="380" y="154" font-size="15" fill="#DBEAFE">Sprint Planning</text>

            <circle cx="590" cy="315" r="145" fill="#10B981" stroke="#047857" stroke-width="8"/>
            <text x="590" y="295" font-size="28" fill="#FFF">SPRINT</text>
            <text x="590" y="330" font-size="18" fill="#D1FAE5">1 a 4 semanas</text>
            <text x="590" y="362" font-size="16" fill="#ECFDF5">Daily Scrum 15m</text>

            <rect x="655" y="65" width="205" height="130" rx="18" fill="#D97706"/>
            <text x="757" y="120" font-size="21" fill="#FFF">Incremento</text>
            <text x="757" y="152" font-size="15" fill="#FEF3C7">Review &amp; Retro</text>
          </g>
        </svg>
      `);

    case 'iso25010_quality':
    default:
      // Designed for cols: 2, rows: 2 — 8 characteristics paired cleanly across 4 tree quadrants
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <!-- Tree branches converging at central node (450, 300) -->
          <g stroke="#334155" stroke-width="5" stroke-linecap="round">
            <line x1="225" y1="185" x2="450" y2="300"/>
            <line x1="675" y1="185" x2="450" y2="300"/>
            <line x1="225" y1="415" x2="450" y2="300"/>
            <line x1="675" y1="415" x2="450" y2="300"/>
          </g>
          <circle cx="450" cy="300" r="32" fill="#0F172A" stroke="#34D399" stroke-width="5"/>
          <circle cx="450" cy="300" r="12" fill="#34D399"/>

          <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
            <!-- Q1 Top-Left -->
            <rect x="28" y="28" width="388" height="106" rx="16" fill="#2563EB"/>
            <text x="222" y="88" font-size="22" fill="#FFF">1. Adecuación Funcional</text>
            <rect x="28" y="150" width="388" height="106" rx="16" fill="#059669"/>
            <text x="222" y="210" font-size="22" fill="#FFF">2. Eficiencia de Desempeño</text>

            <!-- Q2 Top-Right -->
            <rect x="484" y="28" width="388" height="106" rx="16" fill="#7C3AED"/>
            <text x="678" y="88" font-size="22" fill="#FFF">3. Compatibilidad</text>
            <rect x="484" y="150" width="388" height="106" rx="16" fill="#0891B2"/>
            <text x="678" y="210" font-size="22" fill="#FFF">4. Usabilidad</text>

            <!-- Q3 Bottom-Left -->
            <rect x="28" y="344" width="388" height="106" rx="16" fill="#D97706"/>
            <text x="222" y="404" font-size="22" fill="#FFF">5. Fiabilidad</text>
            <rect x="28" y="466" width="388" height="106" rx="16" fill="#DC2626"/>
            <text x="222" y="526" font-size="22" fill="#FFF">6. Seguridad</text>

            <!-- Q4 Bottom-Right -->
            <rect x="484" y="344" width="388" height="106" rx="16" fill="#0F172A"/>
            <text x="678" y="404" font-size="22" fill="#34D399">7. Mantenibilidad</text>
            <rect x="484" y="466" width="388" height="106" rx="16" fill="#334155"/>
            <text x="678" y="526" font-size="22" fill="#FBBF24">8. Portabilidad</text>
          </g>
        </svg>
      `);
  }
}
