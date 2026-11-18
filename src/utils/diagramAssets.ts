import type { GridDiagramKind } from '../types/dsi';

function encodeSvgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

/**
 * Generates crisp, self-contained 900x600 vector diagrams designed for 2x2 or 3x2 CSS grid slicing.
 * Each cell quadrant/sector carries clear geometry, arrows, and labels so visual reconstruction is intuitive.
 */
export function getGridDiagramDataUri(kind?: GridDiagramKind): string {
  switch (kind) {
    case 'pressman_layers':
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
            <rect x="60" y="45" width="780" height="108" rx="18" fill="#0EA5E9" stroke="#0369A1" stroke-width="4"/>
            <text x="450" y="96" font-size="30" fill="#FFFFFF">HERRAMIENTAS (CASE)</text>
            <text x="450" y="130" font-size="18" fill="#E0F2FE">Soporte automatizado para procesos y métodos</text>

            <rect x="60" y="178" width="780" height="108" rx="18" fill="#10B981" stroke="#047857" stroke-width="4"/>
            <text x="450" y="229" font-size="30" fill="#FFFFFF">MÉTODOS (El Cómo)</text>
            <text x="450" y="263" font-size="18" fill="#D1FAE5">Comunicación · Análisis · Diseño · Construcción · Pruebas</text>

            <rect x="60" y="311" width="780" height="108" rx="18" fill="#6366F1" stroke="#4338CA" stroke-width="4"/>
            <text x="450" y="362" font-size="30" fill="#FFFFFF">PROCESO (El Qué)</text>
            <text x="450" y="396" font-size="18" fill="#E0E7FF">Marco de trabajo y actividades sombrilla</text>

            <rect x="60" y="444" width="780" height="112" rx="18" fill="#0F172A" stroke="#334155" stroke-width="4"/>
            <text x="450" y="497" font-size="30" fill="#FBBF24">COMPROMISO CON LA CALIDAD</text>
            <text x="450" y="532" font-size="18" fill="#CBD5E1">Base de toda la Ingeniería de Software (Pressman)</text>
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

            <path d="M285 88 L330 88 L330 170" fill="none" stroke="#1E293B" stroke-width="5" marker-end="url(#a)"/>
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
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <rect x="30" y="30" width="410" height="260" rx="16" fill="#DBEAFE" stroke="#2563EB" stroke-width="3"/>
          <rect x="460" y="30" width="410" height="260" rx="16" fill="#FEE2E2" stroke="#DC2626" stroke-width="3"/>
          <rect x="30" y="310" width="410" height="260" rx="16" fill="#FEF3C7" stroke="#D97706" stroke-width="3"/>
          <rect x="460" y="310" width="410" height="260" rx="16" fill="#D1FAE5" stroke="#059669" stroke-width="3"/>
          <line x1="450" y1="20" x2="450" y2="580" stroke="#0F172A" stroke-width="4"/>
          <line x1="20" y1="300" x2="880" y2="300" stroke="#0F172A" stroke-width="4"/>
          <path d="M450 300 C450 250, 510 250, 510 300 C510 365, 390 365, 390 300 C390 205, 575 205, 575 300 C575 430, 315 430, 315 300 C315 145, 650 145, 650 300" fill="none" stroke="#0F172A" stroke-width="6"/>
          <g font-family="system-ui, sans-serif" font-weight="700">
            <text x="65" y="75" font-size="22" fill="#1E3A8A">1. Fijar Objetivos</text>
            <text x="65" y="105" font-size="16" fill="#1E40AF">Alternativas y restricciones</text>
            <text x="490" y="75" font-size="22" fill="#991B1B">2. Análisis de Riesgos</text>
            <text x="490" y="105" font-size="16" fill="#B91C1C">Prototipos y evaluación</text>
            <text x="490" y="530" font-size="22" fill="#065F46">3. Desarrollar y Probar</text>
            <text x="490" y="556" font-size="16" fill="#047857">Ingeniería del producto (IOC)</text>
            <text x="65" y="530" font-size="22" fill="#92400E">4. Planificar Próxima Fase</text>
            <text x="65" y="556" font-size="16" fill="#B45309">Revisión (LCO / LCA)</text>
          </g>
        </svg>
      `);

    case 'iterative_up':
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
            <rect x="45" y="50" width="190" height="100" rx="16" fill="#0284C7"/>
            <text x="140" y="96" font-size="22" fill="#FFF">Inicio</text>
            <text x="140" y="126" font-size="15" fill="#E0F2FE">Visión y alcance</text>

            <rect x="255" y="50" width="190" height="100" rx="16" fill="#4F46E5"/>
            <text x="350" y="96" font-size="22" fill="#FFF">Elaboración</text>
            <text x="350" y="126" font-size="15" fill="#E0E7FF">Arquitectura base</text>

            <rect x="465" y="50" width="190" height="100" rx="16" fill="#059669"/>
            <text x="560" y="96" font-size="22" fill="#FFF">Construcción</text>
            <text x="560" y="126" font-size="15" fill="#D1FAE5">Implementación</text>

            <rect x="675" y="50" width="180" height="100" rx="16" fill="#D97706"/>
            <text x="765" y="96" font-size="22" fill="#FFF">Transición</text>
            <text x="765" y="126" font-size="15" fill="#FEF3C7">Entrega al usuario</text>

            <rect x="45" y="210" width="810" height="75" rx="12" fill="#E2E8F0" stroke="#94A3B8" stroke-width="3"/>
            <text x="450" y="255" font-size="22" fill="#0F172A">Flujos: Modelado · Requisitos · Análisis y Diseño</text>

            <rect x="45" y="320" width="810" height="75" rx="12" fill="#CBD5E1" stroke="#64748B" stroke-width="3"/>
            <text x="450" y="365" font-size="22" fill="#0F172A">Flujos: Implementación · Pruebas · Despliegue</text>

            <rect x="45" y="430" width="810" height="110" rx="16" fill="#0F172A"/>
            <text x="450" y="482" font-size="26" fill="#34D399">Proceso Unificado (UP / RUP)</text>
            <text x="450" y="516" font-size="18" fill="#CBD5E1">Guiado por Casos de Uso · Centrado en Arquitectura · Iterativo</text>
          </g>
        </svg>
      `);

    case 'morville_ux':
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
            <polygon points="450,210 535,255 535,345 450,390 365,345 365,255" fill="#F59E0B" stroke="#92400E" stroke-width="4"/>
            <text x="450" y="308" font-size="24" fill="#FFF">VALIOSO</text>

            <polygon points="450,35 535,80 535,170 450,215 365,170 365,80" fill="#10B981" stroke="#065F46" stroke-width="4"/>
            <text x="450" y="132" font-size="22" fill="#FFF">ÚTIL</text>

            <polygon points="620,125 705,170 705,260 620,305 535,260 535,170" fill="#0284C7" stroke="#075985" stroke-width="4"/>
            <text x="620" y="222" font-size="22" fill="#FFF">USABLE</text>

            <polygon points="620,305 705,350 705,440 620,485 535,440 535,350" fill="#6366F1" stroke="#3730A3" stroke-width="4"/>
            <text x="620" y="402" font-size="21" fill="#FFF">DESEABLE</text>

            <polygon points="450,390 535,435 535,525 450,570 365,525 365,435" fill="#EC4899" stroke="#9D174D" stroke-width="4"/>
            <text x="450" y="486" font-size="19" fill="#FFF">ACCESIBLE</text>

            <polygon points="280,305 365,350 365,440 280,485 195,440 195,350" fill="#8B5CF6" stroke="#5B21B6" stroke-width="4"/>
            <text x="280" y="402" font-size="21" fill="#FFF">CREÍBLE</text>

            <polygon points="280,125 365,170 365,260 280,305 195,260 195,170" fill="#0D9488" stroke="#115E59" stroke-width="4"/>
            <text x="280" y="222" font-size="18" fill="#FFF">ENCONTRABLE</text>
          </g>
        </svg>
      `);

    case 'uml_views_4plus1':
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
            <rect x="45" y="45" width="320" height="175" rx="18" fill="#2563EB"/>
            <text x="205" y="110" font-size="25" fill="#FFF">Vista Lógica</text>
            <text x="205" y="148" font-size="17" fill="#DBEAFE">Funcionalidad · Clases y Objetos</text>

            <rect x="535" y="45" width="320" height="175" rx="18" fill="#059669"/>
            <text x="695" y="110" font-size="25" fill="#FFF">Vista de Desarrollo</text>
            <text x="695" y="148" font-size="17" fill="#D1FAE5">Módulos · Componentes y Paquetes</text>

            <rect x="45" y="380" width="320" height="175" rx="18" fill="#7C3AED"/>
            <text x="205" y="445" font-size="25" fill="#FFF">Vista de Procesos</text>
            <text x="205" y="483" font-size="17" fill="#EDE9FE">Concurrencia · Hilos y Sincronización</text>

            <rect x="535" y="380" width="320" height="175" rx="18" fill="#D97706"/>
            <text x="695" y="445" font-size="25" fill="#FFF">Vista Física</text>
            <text x="695" y="483" font-size="17" fill="#FEF3C7">Despliegue · Nodos y Hardware</text>

            <rect x="305" y="232" width="290" height="136" rx="18" fill="#0F172A" stroke="#F59E0B" stroke-width="5"/>
            <text x="450" y="294" font-size="24" fill="#FBBF24">+1 Escenarios</text>
            <text x="450" y="328" font-size="17" fill="#CBD5E1">Casos de Uso (Kruchten)</text>
          </g>
        </svg>
      `);

    case 'clean_architecture':
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
            <rect x="60" y="40" width="780" height="110" rx="16" fill="#0284C7"/>
            <text x="450" y="88" font-size="26" fill="#FFF">Capa de Presentación (UI / Vistas)</text>
            <text x="450" y="122" font-size="17" fill="#E0F2FE">Interacción con usuario y controladores</text>

            <rect x="60" y="175" width="780" height="110" rx="16" fill="#10B981"/>
            <text x="450" y="223" font-size="26" fill="#FFF">Capa de Lógica de Negocio (Dominio)</text>
            <text x="450" y="257" font-size="17" fill="#D1FAE5">Reglas del dominio, casos de uso y entidades</text>

            <rect x="60" y="310" width="780" height="110" rx="16" fill="#6366F1"/>
            <text x="450" y="358" font-size="26" fill="#FFF">Capa de Persistencia / Datos</text>
            <text x="450" y="392" font-size="17" fill="#E0E7FF">Repositorios, ORM y acceso a Base de Datos</text>

            <rect x="60" y="445" width="780" height="110" rx="16" fill="#0F172A"/>
            <text x="450" y="493" font-size="26" fill="#FBBF24">Infraestructura / Recursos Compartidos</text>
            <text x="450" y="527" font-size="17" fill="#CBD5E1">Red, sistema operativo y servicios externos</text>
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
      return encodeSvgDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#F8FAFC"/>
          <g font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">
            <rect x="40" y="40" width="250" height="150" rx="16" fill="#2563EB"/>
            <text x="165" y="110" font-size="22" fill="#FFF">Adecuación</text>
            <text x="165" y="140" font-size="22" fill="#FFF">Funcional</text>

            <rect x="325" y="40" width="250" height="150" rx="16" fill="#059669"/>
            <text x="450" y="110" font-size="22" fill="#FFF">Eficiencia de</text>
            <text x="450" y="140" font-size="22" fill="#FFF">Desempeño</text>

            <rect x="610" y="40" width="250" height="150" rx="16" fill="#7C3AED"/>
            <text x="735" y="122" font-size="22" fill="#FFF">Compatibilidad</text>

            <rect x="40" y="225" width="250" height="150" rx="16" fill="#0891B2"/>
            <text x="165" y="308" font-size="24" fill="#FFF">Usabilidad</text>

            <rect x="325" y="225" width="250" height="150" rx="16" fill="#D97706"/>
            <text x="450" y="308" font-size="24" fill="#FFF">Fiabilidad</text>

            <rect x="610" y="225" width="250" height="150" rx="16" fill="#DC2626"/>
            <text x="735" y="308" font-size="24" fill="#FFF">Seguridad</text>

            <rect x="40" y="410" width="390" height="145" rx="16" fill="#0F172A"/>
            <text x="235" y="492" font-size="24" fill="#34D399">Mantenibilidad</text>

            <rect x="470" y="410" width="390" height="145" rx="16" fill="#334155"/>
            <text x="665" y="492" font-size="24" fill="#FBBF24">Portabilidad</text>
          </g>
        </svg>
      `);
  }
}
