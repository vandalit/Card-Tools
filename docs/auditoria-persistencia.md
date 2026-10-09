# Auditoría del paradigma de persistencia

**Fecha:** 2026-10-09  
**Alcance:** flujo de carga, guardado, cambios de entorno, historial de Git y controles de backup/importación. No se inspeccionó el almacenamiento privado de ningún navegador y no se modificaron ni borraron datos.

> **Nota de vigencia:** este informe describe el estado previo a las correcciones registradas en [la bitácora](./bitacora.md). Para el comportamiento actual, consultar esa entrada y el README.

## Resumen ejecutivo

La aplicación no tiene una única fuente de verdad. Según el entorno, lee `vault.json` o `localStorage`, pero todas las escrituras del gestor nuevo van a `localStorage`. No existe un mecanismo conectado que sincronice esos destinos, migre de forma segura la clave antigua o exporte/restaure datos desde la interfaz.

Esto crea escenarios concretos de memoria aparentemente perdida y, en algunos casos, sobrescrita:

1. En `localhost`, la aplicación carga `vault.json` incluso si `localStorage` contiene una versión más reciente. Al recargar, el estado del navegador queda oculto.
2. El raspado de imágenes en segundo plano puede guardar el estado recién cargado desde `vault.json` en la clave actual de `localStorage`, reemplazando una copia más reciente que hubiera allí.
3. La versión previa usaba la clave `cardtools-data`; la actual usa `cardToolsData`. La clave anterior no se migra y sus datos quedan invisibles para la aplicación.
4. `script.js` conserva operaciones antiguas que usan `this.decks`, mientras el estado real está en `this.dataManager.decks`. Algunas acciones de creación/edición/eliminación pueden fallar antes de guardar.

**Conclusión:** hay riesgo alto de pérdida aparente y de sobrescritura de datos del navegador. No es posible afirmar desde el repositorio cuál es la copia recuperable de una instalación concreta, ya que `localStorage` vive fuera de Git, aislado por origen y perfil de navegador.

## Modelo actual observado

| Situación | Lectura al iniciar | Escritura | Consecuencia |
|---|---|---|---|
| `localhost`, `127.0.0.1` | Intenta leer `./vault.json`; solo recurre a `localStorage` si falla el `fetch` | `localStorage` con clave `cardToolsData` | Las escrituras del navegador no son la fuente al recargar mientras el JSON cargue correctamente. |
| GitHub Pages u otro host web | Lee `localStorage` con clave `cardToolsData` | La misma clave | Los datos quedan en ese navegador/origen; no se sincronizan con el repositorio ni con otros dispositivos. |
| `file://` | Intenta `fetch('./vault.json')`, que puede fallar; luego intenta `localStorage` | `localStorage` | El comportamiento y el aislamiento de almacenamiento con `file://` dependen del navegador. No es un destino fiable para datos importantes. |

El origen web incluye esquema, host y puerto. Por ejemplo, `http://localhost:5500`, `http://127.0.0.1:5500` y el dominio de GitHub Pages tienen almacenes distintos. Cambiar navegador o perfil también cambia el almacén disponible.

## Hallazgos detallados

### P1 — El archivo del vault prevalece sobre los datos guardados en localhost

`DataManager.loadData()` llama a `loadFromFile()` en modo local. Si `vault.json` responde correctamente, carga sus decks y no consulta `localStorage`. En cambio, `saveData()` escribe en `localStorage` y nunca actualiza `vault.json`.

**Efecto:** en una sesión local, una modificación que sí haya llegado a guardarse puede desaparecer de la vista tras recargar, porque se vuelve a cargar la versión del archivo. La copia de `localStorage` podría seguir existiendo, pero no es usada en esa ruta.

### P1 — El raspado puede reemplazar la copia local con el vault cargado

Después de renderizar, `LoadingManager` inicia el raspado en segundo plano. Aunque obtiene `cardsNeedingImages`, crea luego una lista con todas las tarjetas que tienen `mainUrl`. Cuando cambia una imagen, `DataManager.updateCardImage()` llama a `saveData()`, que serializa todos los decks en memoria a la clave `cardToolsData`.

En modo local, esos decks proceden normalmente del `vault.json`, no de la copia que ya estaba en `localStorage`. Por eso el raspado puede reemplazar una copia `cardToolsData` más reciente por la versión del archivo, además de guardar solicitudes innecesarias.

### P1 — Cambio de nombre de la clave sin migración

El historial muestra que la implementación anterior leía/escribía `cardtools-data`; la versión modular actual solo usa `cardToolsData`. No hay lectura de compatibilidad ni migración entre las dos claves.

**Efecto:** los datos bajo `cardtools-data` pueden seguir presentes en el almacenamiento del navegador, pero la aplicación actual no los ve. Si se confirma que existen, pueden ser recuperables; no se debe borrar almacenamiento ni sobrescribirlos antes de extraer una copia.

### P1 — Las operaciones de interfaz no están alineadas con el gestor de datos

El constructor de `ResourceManager` instancia `dataManager`, pero no inicializa `this.decks`. Hay definiciones duplicadas de métodos en la clase; las últimas prevalecen. Las implementaciones activas de renderizado y CRUD vuelven a usar `this.decks`, aunque el estado cargado está en `this.dataManager.decks`.

**Efecto:** crear un deck o recurso, editar o eliminar puede lanzar un error antes de guardar, o actuar sobre un estado que no es el que se cargó. El gestor modular contiene métodos CRUD correctos, pero esas rutas antiguas no los delegan de manera consistente.

### P2 — El resultado de `saveData()` se interpreta como booleano aunque no devuelve uno

`DataManager.saveData()` ejecuta `localStorage.setItem(...)`, pero no devuelve `true` ni `false`. El wrapper `ResourceManager.saveData()` tampoco devuelve el resultado de `dataManager.saveData()`. Hay handlers que usan `if (this.saveData())`.

**Efecto:** esas condiciones son siempre falsas cuando el guardado no lanza excepción. En determinadas acciones la mutación sí se escribe en `localStorage`, pero no se ejecuta la actualización de UI, cierre de modal o actualización de filtros que está dentro de la condición. Esto hace parecer que el guardado falló aunque se haya realizado.

### P2 — No existe backup/importación operativa desde la interfaz

La interfaz muestra botones de exportar CSV, importar CSV, crear backup y limpiar datos, pero en el código revisado no hay listeners conectados para esas acciones. Tampoco hay un mecanismo que escriba el estado del navegador de vuelta a `vault.json`.

**Efecto:** no se ofrece desde la aplicación una ruta fiable para crear una copia portable, restaurar una copia ni sincronizar los cambios locales con el repositorio.

### P2 — `localStorage` es almacenamiento por navegador, no sincronización

La aplicación usa almacenamiento del lado del cliente, sin base de datos ni backend. Una copia en GitHub Pages no pasa automáticamente a `vault.json`, a Git ni a otro dispositivo. Borrar datos del sitio, usar otro perfil/navegador u otro origen puede hacer que esa copia deje de estar disponible.

## Evidencia del historial

- La clave `cardtools-data` existía en la implementación anterior; la refactorización modular incorporó `cardToolsData`.
- El historial de `vault.json` muestra solo su commit inicial; no hay commits posteriores que hayan guardado cambios de recursos en ese archivo.
- El commit que incorporó la estructura modular añadió `DataManager` y `LoadingManager`, pero dejó en `ResourceManager` rutas antiguas de estado y guardado.

El historial confirma que el archivo del repositorio ha funcionado como semilla, no como destino de las modificaciones hechas por el usuario en el navegador.

## Qué hacer ahora para preservar y buscar datos recuperables

1. **No usar “Limpiar Datos”, no borrar datos del sitio y no reinstalar/cambiar perfil antes de respaldar.**
2. En cada navegador y perfil usados, abrir las herramientas de desarrollador → **Application/Storage → Local Storage** para los orígenes que se hayan usado (`localhost` con su puerto, `127.0.0.1` con su puerto, GitHub Pages y cualquier dominio propio).
3. Revisar ambas claves: `cardtools-data` y `cardToolsData`. Si existen, copiar su valor completo a archivos JSON separados y conservar los originales. No sobrescribir una clave con la otra.
4. Revisar los datos del archivo `vault.json` del proyecto y cualquier backup/descarga manual. La copia de Git contiene el estado versionado, que puede ser anterior a las modificaciones del navegador.
5. Antes de volver a abrir la aplicación en localhost, conservar las copias anteriores: el proceso de carga/raspado actual puede escribir sobre `cardToolsData`.

No se verificó el `localStorage` real del usuario desde este entorno. Por ello, estos pasos describen dónde buscar y cómo evitar sobrescrituras adicionales; no garantizan que todos los datos sigan existiendo.

## Corrección recomendada

Antes de seguir usando la aplicación con datos importantes:

1. Elegir una fuente de verdad explícita. Para una aplicación estática, una opción segura y simple es que el estado de usuario viva en `localStorage` y que `vault.json` sea solo el conjunto inicial. El guardado debe exportarse/importarse explícitamente si se quiere trasladar o versionar.
2. Implementar una migración de una sola vez de `cardtools-data` a `cardToolsData`: validar el JSON, conservar la clave antigua hasta verificar la nueva y no reemplazar datos existentes sin una decisión explícita.
3. Unificar el CRUD para operar únicamente por `DataManager`; eliminar métodos duplicados que usan `this.decks`.
4. Hacer que `saveData()` informe éxito/fallo explícitamente y que todos los handlers actúen según ese resultado; mostrar los errores de cuota/almacenamiento.
5. Limitar el raspado a las tarjetas que realmente lo necesitan y evitar que una actualización cosmética reemplace el conjunto completo cargado desde una fuente distinta.
6. Conectar y probar exportación/importación/backup antes de confiar datos del usuario a la aplicación.

## Limitaciones de esta auditoría

Fue una auditoría estática del código e historial disponibles. No se probó el comportamiento en un navegador con los datos del usuario ni se accedió a ningún `localStorage` real. La sintaxis JavaScript y la validez de `vault.json` ya se habían comprobado durante la revisión anterior; no se cambió código en esta auditoría.
