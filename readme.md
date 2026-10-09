# Card Tools

Card Tools es un prototipo web estático para guardar y consultar recursos útiles de desarrollo y diseño. La idea es agrupar sitios, herramientas, frameworks y APIs en colecciones (“decks”), con categorías, etiquetas, favoritos, notas y enlaces relacionados.

## Estado actual

El proyecto está organizado por etapas. El código existente se conserva en **Stub 01** para dejar claro que es una base experimental y no una versión estable:

- **Stub 01:** aplicación actual en [`stub/01/`](./stub/01/). Permite explorar el concepto de catálogo de recursos, pero su persistencia no es fiable todavía.
- **Lab 01:** etapa planificada para investigar y validar el modelo de persistencia de forma aislada.
- **Stub 02:** etapa planificada para integrar los aprendizajes del laboratorio en un nuevo prototipo, sin reemplazar Stub 01 hasta verificar el resultado.

El [`index.html`](./index.html) de la raíz funciona como índice de etapas. Para abrir la aplicación actual, usa [Stub 01](./stub/01/index.html).

> **Advertencia:** no confíes datos importantes a Stub 01 ni limpies el almacenamiento del navegador. Antes de continuar, conserva cualquier dato local recuperable. La aplicación no implementa actualmente un flujo operativo de backup/restauración.

## Tecnologías

- HTML, CSS y JavaScript sin framework.
- `vault.json` como conjunto de datos de ejemplo para Stub 01.
- `localStorage` como almacenamiento del navegador en el prototipo actual.
- Font Awesome y Simple Icons cargados desde CDNs externos.

No hay dependencias de Node ni un proceso de compilación declarado. El prototipo debe servirse desde un servidor estático local para evitar diferencias del protocolo `file://`; por ejemplo, desde la raíz se puede usar `python3 -m http.server` y abrir `http://localhost:8000/`.

## Hoja de ruta — prioridad: persistencia

### 0. Preservar datos antes de reparar

- No borrar los datos del sitio, perfiles ni claves de almacenamiento existentes.
- Revisar en cada navegador, perfil y origen utilizados las claves `cardtools-data` y `cardToolsData`.
- Guardar cualquier valor encontrado como archivo JSON independiente antes de migrar o volver a ejecutar el prototipo.
- Conservar `stub/01/vault.json` y los backups manuales existentes.

### 1. Establecer una única fuente de verdad

- Definir el almacenamiento persistente de usuario como fuente primaria, sin cambiar de comportamiento según se ejecute en localhost o en hosting.
- Usar `vault.json` solo como datos iniciales cuando todavía no exista almacenamiento del usuario; nunca cargarlo por encima de datos guardados.
- Acordar una clave canónica y un formato versionado del documento persistido.
- Mostrar errores de lectura/escritura, JSON corrupto y cuota agotada; no sustituir datos inválidos silenciosamente por defaults.

### 2. Recuperar y migrar compatiblemente

- Detectar tanto `cardtools-data` como `cardToolsData`.
- Validar y comparar las copias antes de decidir cuál migrar; si ambas existen y difieren, conservar ambas y pedir una elección en lugar de sobrescribir.
- Hacer la migración atómica: escribir y verificar la copia nueva antes de considerar archivada la anterior.
- Mantener respaldo de origen y registrar versión/fecha de migración.

### 3. Unificar el flujo de cambios y guardado

- Hacer que todas las acciones de UI llamen a `DataManager`; eliminar implementaciones duplicadas basadas en `this.decks`.
- Asegurar que `saveData()` devuelva un resultado explícito y que la interfaz solo confirme el cambio después de una escritura exitosa.
- Evitar que la carga de imágenes en segundo plano guarde una copia antigua o reemplaze el conjunto completo de datos.
- Mantener los cambios cosméticos (como imágenes) separados o aplicarlos sobre el estado vigente sin perder otros campos.

### 4. Implementar backup, exportación e importación

- Ofrecer exportación completa del formato JSON canónico, sin perder campos como favoritos, notas, etiquetas, enlaces y orden.
- Validar y previsualizar una importación antes de reemplazar o combinar datos.
- Pedir confirmación explícita antes de operaciones destructivas y permitir restaurar el backup descargado.
- No mostrar acciones de backup/importación como operativas hasta que estén conectadas y probadas.

### 5. Verificar persistencia con pruebas de regresión

- Probar reinicio y recarga en localhost, GitHub Pages y un origen personalizado.
- Cubrir ambos nombres históricos de clave, almacén vacío, JSON inválido, dos copias divergentes y error de cuota.
- Comprobar que crear, editar, eliminar, cambiar favoritos y actualizar imágenes sobreviva a una recarga.
- Confirmar que una importación/exportación de ida y vuelta conserva el documento completo.

### 6. Decidir si se requiere sincronización

`localStorage` solo persiste en un navegador, perfil y origen concretos; no sincroniza entre dispositivos. Si el producto necesita una memoria compartida, multiusuario o recuperable fuera del dispositivo, diseñar posteriormente un backend con autenticación, copias de seguridad y una estrategia de conflictos. No asumir que GitHub Pages sincroniza el almacenamiento local.

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