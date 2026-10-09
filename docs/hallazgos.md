# Hallazgos del proyecto

Revisión exploratoria de la estructura y el código de Card Tools. El proyecto es una aplicación web estática en español para organizar recursos de desarrollo y diseño en decks, con búsqueda, favoritos, enlaces y carga de imágenes. Usa HTML, CSS y JavaScript sin framework ni dependencias declaradas.

## Hallazgos principales

### 1. Lógica duplicada y estado inconsistente en `ResourceManager` — prioridad alta

En [script.js](../script.js) hay métodos de una implementación antigua y métodos de la implementación modular dentro de la misma clase. Los métodos duplicados de una clase JavaScript quedan definidos por la última declaración. Por ejemplo, el `render()` anterior delega en `UIManager`, pero el posterior intenta usar `this.decks` ([script.js](../script.js#L64), [script.js](../script.js#L216)). El constructor no inicializa esa propiedad; los datos viven en `this.dataManager.decks`.

Varias operaciones posteriores a la carga inicial llaman a `this.render()`, mientras que la secuencia de inicio renderiza mediante `UIManager` directamente ([loading-manager.js](../loading-manager.js#L12)). Esto puede hacer que la vista inicial cargue, pero que interacciones posteriores —como buscar o crear recursos— fallen o queden inconsistentes. También hay duplicaciones de `bindEvents`, `addCard`, `updateCard` y `deleteDeck`.

**Recomendación:** escoger una única implementación como fuente de verdad y eliminar o adaptar la lógica antigua para que todas las operaciones trabajen a través de `DataManager` y `UIManager`.

### 2. Los cambios en modo local no se vuelcan automáticamente a `vault.json` — prioridad alta

En entorno local, `loadData()` intenta leer `vault.json`; los cambios se guardan en `localStorage` bajo `cardToolsData` ([data-manager.js](../data-manager.js#L48), [data-manager.js](../data-manager.js#L63), [data-manager.js](../data-manager.js#L94)). Al recargar con `vault.json` disponible, la aplicación vuelve a cargar el archivo y no aplica primero los datos de `localStorage`.

**Impacto observado:** los cambios guardados en el navegador pueden no aparecer después de una recarga en `localhost`, y el archivo del proyecto permanece sin actualizar. La interfaz ofrece un botón de backup, pero su comportamiento no parece estar conectado (ver hallazgo 3).

**Recomendación:** definir explícitamente la precedencia entre archivo y almacenamiento del navegador, y ofrecer un flujo probado para persistir/exportar los cambios.

### 3. El menú de datos presenta controles sin acciones conectadas — prioridad media

En [index.html](../index.html#L30) aparecen controles para exportar CSV, importar CSV, crear backup y limpiar datos. En el JavaScript revisado, el único botón del menú de datos conectado es el que abre/cierra el menú; no se encontraron listeners para esos cuatro controles. También existe un selector de archivo CSV sin un flujo de importación conectado.

**Impacto observado:** los controles se muestran, pero sus acciones no parecen estar implementadas o cableadas.

**Recomendación:** implementar y probar cada acción, o retirar temporalmente los controles que no estén disponibles.

### 4. Renderizado de datos mediante `innerHTML` — riesgo de inyección

Los valores de recursos y decks se interpolan en plantillas asignadas a `innerHTML`, incluyendo títulos, categorías, etiquetas, descripciones, URLs y nombres ([ui-manager.js](../ui-manager.js#L62), [ui-manager.js](../ui-manager.js#L100), [script.js](../script.js#L239)). El formulario permite crear datos que luego se vuelven a renderizar de esta manera.

**Impacto observado:** contenido con marcado o atributos HTML puede convertirse en contenido activo en la página. Es especialmente importante proteger datos persistidos o importados y las URLs usadas en atributos.

**Recomendación:** preferir creación de nodos y asignación de `textContent`/propiedades seguras; validar también el protocolo de las URLs admitidas.

### 5. El raspado de imágenes recorre recursos que ya tienen imagen — prioridad media

`startImageScraping()` obtiene primero las tarjetas que necesitan imagen, pero después construye otra lista con todas las tarjetas que tienen `mainUrl` y procesa esa lista completa ([loading-manager.js](../loading-manager.js#L43), [loading-manager.js](../loading-manager.js#L53), [loading-manager.js](../loading-manager.js#L65)).

**Impacto observado:** solicitudes y demoras innecesarias, además de depender de sitios externos y del proxy usado para consultar metadatos ([image-scraper.js](../image-scraper.js#L120)).

**Recomendación:** procesar solo las tarjetas de `getCardsNeedingImages()` y manejar límites, fallos y tiempos de espera de forma visible.

## Aspectos positivos

- La interfaz y los formularios están en español.
- Hay una separación inicial en módulos de datos, interfaz, carga y búsqueda de imágenes.
- La carga inicial muestra un estado skeleton y contempla actualización de imágenes en segundo plano.
- `vault.json` es JSON válido y contiene datos de ejemplo estructurados.

## Alcance y validaciones

- Se revisaron `index.html`, los módulos JavaScript, los estilos y `vault.json`.
- `node --check` pasó para los cinco archivos JavaScript.
- `vault.json` se pudo parsear correctamente.
- No se encontraron archivos de pruebas, configuración de empaquetado ni manifiesto de dependencias en la raíz revisada.

Este documento registra una revisión exploratoria; no sustituye una ejecución funcional completa en navegador ni una auditoría exhaustiva.
