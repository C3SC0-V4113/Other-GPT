---
name: decision-doc-sync
description: Skill ligera para sincronizar documentacion cuando se toman decisiones estructurales de arquitectura, diseno o contratos.
---

# Decision Documentation Sync

Usa esta skill cuando el cambio incluya decisiones estructurales.

## Trigger

Aplica solo si hay cambios en:

- arquitectura de componentes o capas,
- estandar de UX/UI,
- contratos globales de comportamiento,
- convenciones transversales del proyecto.

No aplica para cambios menores o fixes locales sin impacto estructural.

## Regla de sincronizacion

Si hubo decision estructural, revisar y actualizar segun impacto:

1. `README.md` (arquitectura y contratos).
2. `DESIGN.md` (estandar visual/UX).
3. `AGENTS.md` (referencias operativas minimas, sin duplicar contenido extenso).
4. `docs/adr/` (crear o actualizar ADR correspondiente).

## Checklist de cierre

- ¿Hubo decision estructural?
- ¿README y DESIGN reflejan la decision?
- ¿Se creo o actualizo ADR con contexto, decision y consecuencias?
- ¿AGENTS mantiene referencias y evita duplicacion?
