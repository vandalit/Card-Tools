# Card Tools

Card Tools es un prototipo web estático para guardar y consultar recursos útiles de desarrollo y diseño. La idea es agrupar sitios, herramientas, frameworks y APIs en colecciones (“decks”), con categorías, etiquetas, favoritos, notas y enlaces relacionados.

## Seeder y memoria del usuario

`stub/01/vault.json` es el **seeder placeholder versionado con la app**: contiene los decks y recursos iniciales que verá una instalación sin datos guardados (actualmente, 4 decks y 7 recursos). Al desplegar una versión del repositorio en GitHub Pages, todos los visitantes sin una copia previa reciben ese mismo conjunto inicial.

El seeder no es la memoria compartida de los visitantes:

- Cada origen y perfil de navegador mantiene su propio `localStorage`. GitHub Pages y localhost empiezan del mismo `vault.json`, pero sus cambios no se comparten.
- La primera carga usa `vault.json` solo cuando no encuentra `cardToolsData` ni `cardtools-data`. Después, la copia local prevalece sobre el seeder.
- El raspado automático puede actualizar las portadas del seeder y guardar esa copia en el navegador. Desde entonces, cambios futuros a `vault.json` en el repositorio **no se fusionan automáticamente** en ese navegador; la copia ya persistida sigue prevaleciendo.
- Por lo tanto, para que todos los visitantes nuevos reciban decks iniciales distintos, se actualiza `stub/01/vault.json` y se despliega el cambio. Para visitantes que ya tienen datos locales, hará falta una futura función explícita de actualización/merge o restauración.

Esta separación es intencional: `vault.json` es la plantilla inicial del prototipo; `localStorage` es la memoria privada de cada navegador. Ninguno de los dos reemplaza una solución de sincronización o backup.

## Estado actual

El proyecto está organizado por etapas. El código existente se conserva en **Stub 01** para dejar claro que es una base experimental y no una versión estable:

- **Stub 01:** aplicación actual en [`stub/01/`](./stub/01/). Permite explorar el catálogo; su persistencia dentro del mismo origen ya está corregida, pero aún no sincroniza orígenes/dispositivos ni ofrece backup/restauración.
- **Lab 01:** etapa planificada para investigar y validar el modelo de persistencia de forma aislada.
- **Stub 02:** etapa planificada para integrar los aprendizajes del laboratorio en un nuevo prototipo, sin reemplazar Stub 01 hasta verificar el resultado.

El [`index.html`](./index.html) de la raíz funciona como índice de etapas. Para abrir la aplicación actual, usa [Stub 01](./stub/01/index.html).

> **Advertencia:** el navegador aísla `localStorage` por origen y perfil. La política de carga ya es la misma en localhost y GitHub Pages, pero esas ubicaciones no comparten ni sincronizan datos. Conserva los datos locales recuperables; todavía no hay una interfaz funcional de backup/restauración.

## Tecnologías

- HTML, CSS y JavaScript sin framework.
- `stub/01/vault.json` como seeder versionado de decks y recursos iniciales para Stub 01.
- `localStorage` como almacenamiento de usuario en Stub 01, con la misma prioridad en todos los entornos.
- Font Awesome y Simple Icons cargados desde CDNs externos.

No hay dependencias de Node ni un proceso de compilación declarado. El prototipo debe servirse desde un servidor estático local para evitar diferencias del protocolo `file://`; por ejemplo, desde la raíz se puede usar `python3 -m http.server` y abrir `http://localhost:8000/`.

## Hoja de ruta — prioridad: persistencia

### 0. Preservar datos de otros orígenes

- No borrar los datos del sitio, perfiles ni claves de almacenamiento existentes antes de recuperar copias creadas con versiones anteriores.
- Revisar en cada navegador, perfil y origen utilizados las claves `cardtools-data` y `cardToolsData`.
- Guardar cualquier valor encontrado como archivo JSON independiente antes de migrar o volver a ejecutar el prototipo.
- Conservar `stub/01/vault.json` y los backups manuales existentes.

### 1. Establecer una única fuente de verdad — implementado en Stub 01

- `cardToolsData` es la clave canónica, consultada en localhost y en hosting.
- `vault.json` es solo el seeder: se carga si no existe memoria local y no se mezcla automáticamente con datos ya guardados.
- El documento mantiene `version` y `lastModified`; los datos inválidos producen un error visible en vez de cargar defaults sobre ellos.

### 2. Recuperar y migrar compatiblemente — implementado en Stub 01

- Se reconoce la clave antigua `cardtools-data`; se copia a la clave canónica y la original se conserva.
- Si ambas claves contienen decks distintos, el arranque se detiene con un aviso para evitar escoger/sobrescribir silenciosamente.
- Si la escritura de una mutación falla, se revierte el estado en memoria y se notifica el error.

La aplicación no puede migrar datos entre `localhost` y GitHub Pages por sí sola: son almacenes aislados del navegador. La migración anterior solo ocurre dentro del mismo origen/perfil.

### 3. Unificar el flujo de cambios y guardado — base implementada

- Las acciones CRUD activas delegan en `DataManager`, con rollback de memoria si falla el guardado.
- La carga automática de portadas solo procesa tarjetas que necesitan imagen; agrupa los cambios de imagen en una escritura.
- Se mantiene el refresco explícito de todas las imágenes como ruta separada.

### 4. Implementar backup, exportación e importación

**Pendiente.**

- Ofrecer exportación completa del formato JSON canónico, sin perder campos como favoritos, notas, etiquetas, enlaces y orden.
- Validar y previsualizar una importación antes de reemplazar o combinar datos.
- Pedir confirmación explícita antes de operaciones destructivas y permitir restaurar el backup descargado.
- No mostrar acciones de backup/importación como operativas hasta que estén conectadas y probadas.

### 5. Verificar persistencia con pruebas de regresión

Las pruebas iniciales de persistencia están disponibles con Node.js:

```sh
node --test stub/01/tests/persistence.test.js
```

- Probar reinicio y recarga en localhost, GitHub Pages y un origen personalizado.
- Cubrir ambos nombres históricos de clave, almacén vacío, JSON inválido, dos copias divergentes y error de cuota.
- Comprobar que crear, editar, eliminar, cambiar favoritos y actualizar imágenes sobreviva a una recarga.
- Confirmar que una importación/exportación de ida y vuelta conserva el documento completo.

La cobertura automatizada actual cubre carga, migración, conflicto, JSON inválido, fallback a vault, rollback y escritura en lote. Falta cobertura browser-level del ciclo CRUD completo y de exportar/restaurar.

### 6. Decidir si se requiere sincronización

`localStorage` solo persiste en un navegador, perfil y origen concretos; no sincroniza entre dispositivos. Si el producto necesita una memoria compartida, multiusuario o recuperable fuera del dispositivo, diseñar posteriormente un backend con autenticación, copias de seguridad y una estrategia de conflictos. No asumir que GitHub Pages sincroniza el almacenamiento local.

Por separado, definir una política para actualizar el seeder sin reemplazar ni perder los datos ya persistidos de visitantes existentes.

## Estructura de etapas

```text
.
├── index.html                 # Índice raíz de etapas
├── readme.md                  # Descripción, estado y hoja de ruta
├── docs/                      # Hallazgos y auditorías
├── stub/
│   ├── 01/                    # Prototipo actual
│       ├── index.html
│       ├── vault.json
│       └── *.js, *.css
│   └── 02/                    # Iteración futura (planificada)
└── lab/
    └── 01/                    # Laboratorio de persistencia (planificado)
```

Las etapas futuras no se consideran implementadas hasta que tengan su propio contenido y pruebas. El índice las marca como planificadas.

## Documentación relacionada

- [Hallazgos iniciales](./docs/hallazgos.md)
- [Auditoría de persistencia](./docs/auditoria-persistencia.md)
- [Bitácora de análisis y cambios](./docs/bitacora.md)
- [Pruebas de persistencia](./stub/01/tests/persistence.test.js)