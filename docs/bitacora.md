# Bitácora de Stub 01

## 2026-10-09 — Auditoría y corrección de persistencia y scraping de portadas

### Estado previo

- El gestor elegía una ruta de lectura según el host: en localhost intentaba primero `vault.json`, mientras GitHub Pages leía `localStorage`.
- Todos los cambios se escribían en `localStorage` bajo `cardToolsData`; no se actualizaba el JSON del repositorio.
- La versión previa había usado la clave `cardtools-data`, que la versión actual no consultaba ni migraba.
- Si `vault.json` se cargaba correctamente, podía ocultar los cambios guardados en el navegador al recargar. El scraping de arranque podía volver a guardar el vault recién cargado sobre `cardToolsData`.
- La interfaz conservaba operaciones CRUD basadas en `this.decks`, separado del estado cargado en `dataManager.decks`. Además, algunos handlers interpretaban el retorno de `saveData()` como booleano aunque no devolvía valor.
- Había dos selectores de portadas activos en flujos distintos y un tercer método lazy sin llamadas encontradas:
  - El scraper modular de `ImageScraper`, iniciado por `LoadingManager` al abrir la app.
  - El scraper legado de `ResourceManager`, usado al crear/editar un recurso.
  - `ResourceManager.startLazyImageLoading()`, presente pero sin uso desde el arranque revisado.

### Análisis del scraper preservado

El scraper modular conserva esta prioridad:

1. Catálogo curado por hostname exacto, validado mediante carga de imagen.
2. `manifest.json` y luego metadatos SEO consultados mediante AllOrigins.
3. Favicon del dominio en tamaños conocidos.
4. Google Favicon como último recurso.

El scraper legado conserva su ruta separada:

1. Catálogo curado.
2. Metadatos SEO (`og:image`, Twitter, `article:image` y `image_src`) vía AllOrigins.
3. Iconos de `manifest.json`.
4. Favicon del dominio.
5. Google Favicon; ante excepción usa su fallback existente.

La UI todavía muestra `coverImage` o, si falta/falla, un icono de categoría de Simple Icons. No se fusionaron ni reordenaron estos selectores; el guardado de imágenes sigue actualizando el campo `coverImage`.

### Propuesta

- Hacer que ambas ejecuciones, localhost y hosting, consulten primero el almacenamiento del navegador con una clave canónica.
- Usar el vault versionado del directorio de Stub 01 únicamente como semilla cuando no exista almacenamiento de usuario.
- Migrar la clave histórica solo si la nueva no existe, sin eliminar la fuente antigua; si hay dos copias válidas y divergentes, detenerse y preservar ambas.
- Unificar las mutaciones por `DataManager`, confirmar explícitamente el resultado del guardado y revertir cambios en memoria cuando una escritura falla.
- Reducir el trabajo automático de portadas a tarjetas necesitadas, agrupar las escrituras y conservar una ruta independiente para refrescar todas.
- Ser explícitos: `localStorage` sigue aislado por navegador, perfil y origen; esta corrección no sincroniza localhost con GitHub Pages.

### Cambios realizados

- `DataManager` ahora prioriza `cardToolsData` en cualquier host. Si no existe, migra `cardtools-data`, valida los decks y conserva intacta la clave histórica.
- Si ambas claves contienen decks diferentes, el inicio muestra error y no elige una copia silenciosamente. Si coinciden, informa que ambas se conservaron.
- Si no hay datos del usuario, `vault.json` se carga como semilla. Un vault inválido o una copia de almacenamiento inválida no se reemplaza silenciosamente por datos por defecto.
- `saveData()` devuelve éxito, alerta ante error de almacenamiento y conserva el error explícito. Las mutaciones del gestor se revierten en memoria cuando la escritura falla.
- Los handlers CRUD activos de `ResourceManager` delegan en `DataManager`; búsqueda, filtros y renderizado usan el mismo estado cargado.
- Los decks vacíos recién creados ahora permanecen visibles cuando no hay filtros activos.
- Los errores de carga se muestran en la interfaz; los avisos de migración/conflicto se presentan sin sobrescribir ninguna clave.
- `LoadingManager` procesa automáticamente solo `getCardsNeedingImages()` y guarda las portadas encontradas en lote. `refreshAllImages()` sigue recorriendo todas las tarjetas explícitamente.
- `ResourceManager.startLazyImageLoading()` también usa la lista de tarjetas necesitadas y persiste los cambios en lote, aunque no se encontró una llamada activa a ese método.
- Se mantuvo sin cambios el orden de selección y fallback de ambos scrapers activos.

### Validaciones

- Sintaxis de todos los JavaScript de Stub 01 comprobada con `node --check`.
- `vault.json` comprobado como JSON válido.
- Se añadieron pruebas de regresión ejecutables con `node --test stub/01/tests/persistence.test.js`: 7 casos pasaron para carga canónica, migración, conflicto, JSON inválido, semilla, rollback, escritura en lote y filtrado de decks vacíos.
- En navegador aislado se comprobó que crear un deck lo muestra inmediatamente y persiste tras recargar.
- Se verificó la carga de la app y las tarjetas sin necesidad de modificar el orden de selección de portadas.

### Pendiente

- Backup/exportación/importación operativos y restauración de datos entre orígenes.
- Sincronización entre dispositivos, si el producto la necesita; requeriría una solución distinta de `localStorage`.
- Pruebas browser-level del ciclo CRUD completo y de exportar/restaurar.
