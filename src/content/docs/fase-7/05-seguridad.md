---
title: "5 · Seguridad por diseño"
description: Autenticación y autorización, OAuth 2.0 y OpenID Connect, trampas de los JWT, control de acceso a nivel de objeto, TLS y mTLS, gestión de secretos, cumplimiento, abuso y modelado de amenazas con STRIDE.
sidebar:
  order: 5
---

**Objetivo:** incorporar la seguridad al diseño desde el principio: quién es quién, quién puede qué, qué se protege, y dónde puede atacar alguien.
**Tiempo:** 4–5 días
**Lecturas:** OWASP Top 10 (edición vigente) y OWASP *API Security Top 10* · Primer, *Security* · Documentación de OAuth 2.0 (oauth.net/2) y OpenID Connect · Microsoft, *Threat Modeling* (introducción a STRIDE).

## Antes de leer: predice

1. Un usuario autenticado llama a `GET /pedidos/10452`. El pedido es de otra persona. ¿Qué comprobación falta, si la API solo valida que el token es válido?
2. Un JWT caduca en 24 h. El usuario cierra sesión porque le han robado el móvil. ¿Puedes invalidar ese token?

```respuesta id="f7-05-predice" titulo="Mis predicciones"
Antes de leer: responde con lo que sepas o intuyas. No importa acertar.
```

## Autenticación y autorización

- **Autenticación (authn):** ¿quién eres? Contraseñas (con hash lento: Argon2, bcrypt), segundo factor, passkeys.
- **Autorización (authz):** ¿qué puedes hacer? Se comprueba en **cada** petición y sobre **cada** recurso.

Respuesta a la primera predicción: falta la **autorización a nivel de objeto**: comprobar que el pedido 10452 **pertenece** al usuario. Es el fallo número uno de la lista OWASP de seguridad de APIs (*Broken Object Level Authorization*, BOLA, también llamado IDOR). Validar el token solo dice **quién** llama, no **a qué** tiene derecho. Si además los IDs son secuenciales ([Fase 2](/fase-2/07-objetos-e-ids/#ids-frente-a-secretos)), un atacante recorre todos los pedidos.

Modelos de autorización: **RBAC** (por roles: comprador, organizador, administrador), **ABAC** (por atributos: "el organizador solo ve las ventas de **sus** eventos") o una combinación. Centraliza la lógica en un componente o librería, no repartida en cada handler.

## OAuth 2.0 y OpenID Connect

- **OAuth 2.0** es un marco de **autorización delegada**: permite a una aplicación actuar en nombre de un usuario con permisos acotados, sin conocer su contraseña. Emite **tokens de acceso**.
- **OpenID Connect (OIDC)** añade **identidad** encima de OAuth 2.0: un **ID token** que dice quién es el usuario. Es lo que usas para "iniciar sesión con…".
- Flujo recomendado para apps web y móviles: **authorization code con PKCE**.
- No implementes un servidor de identidad propio salvo que sea tu negocio: usa un proveedor (Keycloak, Auth0, Cognito, Entra ID…). Es un subdominio **genérico** ([Fase 5](/fase-5/05-ddd-y-descomposicion/#subdominios)).

## JWT y sus trampas

Un JWT es un token **autocontenido y firmado**: el servidor puede validarlo sin consultar a nadie. Eso es su ventaja y su problema.

Respuesta a la segunda predicción: **no directamente.** Un JWT válido lo es hasta que caduca; no hay un sitio central donde "borrarlo". Soluciones:

- **Tokens de acceso de vida corta** (5–15 min) y **tokens de refresco** revocables (guardados en el servidor).
- Una **lista de revocación** consultada en cada petición (pierde parte de la ventaja de no consultar a nadie).

Otras reglas:

- Validar **siempre** firma, algoritmo esperado (nunca aceptar `alg: none`), emisor (`iss`), audiencia (`aud`) y caducidad (`exp`).
- El contenido va **firmado, no cifrado**: cualquiera puede leerlo. Nada sensible dentro.
- En navegador, preferir **cookies `HttpOnly`, `Secure`, `SameSite`** a guardarlo en `localStorage` (accesible a cualquier script inyectado).

## Protección de los datos y de las comunicaciones

- **TLS en todas partes**, también dentro de la red interna. Entre servicios, **mTLS** (ambos lados presentan certificado), a menudo gestionado por un *service mesh*.
- **Cifrado en reposo** de bases de datos, copias y almacenes de objetos (normalmente con claves gestionadas por un KMS).
- **Secretos** (contraseñas de base de datos, claves de API): nunca en el repositorio ni en imágenes. En un gestor de secretos (Vault, el del proveedor cloud), con **rotación** y acceso auditado.
- **Mínimo privilegio:** cada servicio, con las credenciales justas para lo que hace. El servicio de catálogo no necesita poder escribir en la tabla de pagos.

## Cumplimiento

- **Pagos (PCI DSS):** la mejor forma de cumplir es **no tocar los datos de tarjeta**. Usar la página o los campos alojados del PSP reduce drásticamente el alcance de la certificación. Taquilla nunca ve un número de tarjeta.
- **Datos personales (RGPD):** minimización (guardar solo lo necesario), finalidad, derecho de supresión (recuerda el *crypto-shredding* de la [Fase 6](/fase-6/03-cdc-event-sourcing-cqrs/#event-sourcing)), registro de accesos, y dónde se guardan los datos.

## Abuso: bots y reventa

Para Taquilla, el atacante más probable no es un hacker, sino un **bot de reventa**:

- Rate limiting por IP, cuenta, tarjeta y dispositivo.
- La cola virtual con tokens de admisión **firmados y ligados** a la sesión o la cuenta.
- Retos (CAPTCHA o similares) en los puntos de entrada, no en cada paso.
- Límite de entradas por cuenta **y** por tarjeta y por dirección.
- Cuentas verificadas (teléfono) para eventos de alta demanda.
- Entradas nominativas o con transferencia controlada, y QR que cambian (rotan) hasta cerca del evento, para dificultar la reventa de capturas de pantalla.
- Detección en streaming de patrones anómalos ([Fase 6](/fase-6/04-procesamiento-de-streams/#ejercicio-2--diseña-el-procesamiento)).

## Modelado de amenazas con STRIDE

Recorre el diagrama de flujo de datos (tu C4) y, en cada elemento y cada flecha, pregunta por cada categoría:

| Amenaza | Propiedad que ataca | Pregunta | Mitigación típica |
|---|---|---|---|
| **S**poofing (suplantación) | Autenticación | ¿Puede alguien hacerse pasar por otro? | Autenticación fuerte, firma de webhooks |
| **T**ampering (manipulación) | Integridad | ¿Puede alguien alterar datos o mensajes? | TLS, firmas, validación en el servidor |
| **R**epudiation (repudio) | No repudio | ¿Puede alguien negar haber hecho algo? | Registros de auditoría inmutables |
| **I**nformation disclosure (revelación) | Confidencialidad | ¿Puede filtrarse información? | Autorización por objeto, cifrado, no loguear secretos |
| **D**enial of service (denegación) | Disponibilidad | ¿Puede alguien tumbar el servicio? | Rate limiting, load shedding, CDN |
| **E**levation of privilege (elevación) | Autorización | ¿Puede alguien obtener permisos que no tiene? | Mínimo privilegio, validar roles en el servidor |

Además, repasa la edición vigente del **OWASP Top 10**: categorías como el control de acceso roto, la inyección, los fallos criptográficos, la configuración insegura y los problemas de la cadena de suministro (dependencias vulnerables) aparecen edición tras edición.

## Ejercicios

### Ejercicio 1 · Encuentra los fallos

Revisa este handler de Taquilla y encuentra al menos cinco problemas de seguridad:

```go
mux.HandleFunc("GET /entradas/{id}", func(w http.ResponseWriter, r *http.Request) {
	tok, _ := jwt.Parse(r.Header.Get("Authorization"), claveFunc) // ignora el error
	id := r.PathValue("id")
	row := db.QueryRow("SELECT qr, titular, email FROM entradas WHERE id = " + id)
	var qr, titular, email string
	row.Scan(&qr, &titular, &email)
	log.Printf("entrada %s consultada, qr=%s, token=%v", id, qr, tok)
	json.NewEncoder(w).Encode(map[string]string{"qr": qr, "titular": titular, "email": email})
})
```

```respuesta id="f7-05-ej1" titulo="Encuentra los fallos"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Solución</summary>

1. **Se ignora el error de validación del token**: un token inválido o ausente pasa.
2. **Inyección SQL**: el ID se concatena en la consulta. Usar parámetros (`$1`).
3. **Sin autorización por objeto**: cualquier usuario autenticado (o no, por el punto 1) obtiene la entrada de cualquiera. Añadir `AND titular_id = $2` con el usuario del token.
4. **Se registran secretos**: el QR (que da acceso al recinto) y el token en los logs.
5. **Exposición excesiva de datos**: devuelve el email aunque la pantalla no lo necesite.
6. Sin comprobar el error de `Scan` (`404` si no existe). Sin rate limiting frente a quien prueba IDs.

</details>

### Ejercicio 2 · STRIDE del webhook de pagos

Aplica STRIDE al endpoint que recibe el webhook del PSP que confirma un pago. Al menos una amenaza por categoría, con su mitigación.

```respuesta id="f7-05-ej2" titulo="STRIDE del webhook de pagos"
Escribe aquí tu razonamiento antes de abrir las pistas.
```

<details>
<summary>Una respuesta razonable</summary>

- **S:** cualquiera llama al webhook diciendo "pago confirmado" → verificar la **firma HMAC** del PSP y, opcionalmente, consultar el estado al PSP antes de emitir entradas.
- **T:** alteran el importe en tránsito → TLS + firma sobre el cuerpo; comparar el importe con el del pedido.
- **R:** "nunca recibimos ese webhook" → guardar cada webhook recibido (cuerpo, firma, fecha) de forma inmutable.
- **I:** los logs del webhook contienen datos personales → registrar solo identificadores.
- **D:** inundan el endpoint → rate limiting, responder rápido y procesar en segundo plano; limitar por IP de origen del PSP si la publica.
- **E:** el endpoint del webhook acepta también operaciones internas → endpoint dedicado, con permisos mínimos (solo puede marcar pagos como confirmados).

</details>

## Taquilla

1. Define la **autenticación** (proveedor OIDC, duración de tokens, revocación) y el modelo de **autorización** (roles y atributos: comprador, organizador de sus eventos, personal de acceso de un recinto, administración).
2. Haz el **modelo de amenazas STRIDE** del flujo de compra completo (de la cola virtual a la entrada emitida).
3. Diseña las **medidas contra bots y reventa**.
4. Documenta cómo cumples PCI DSS (sin tocar tarjetas) y el RGPD.

## Autorrevisión

- [ ] Distingo autenticación de autorización y compruebo la autorización por objeto.
- [ ] Sé qué hacen OAuth 2.0 y OIDC y qué flujo usar.
- [ ] Conozco las trampas de los JWT y cómo revocarlos.
- [ ] Aplico mínimo privilegio, mTLS y gestión de secretos.
- [ ] Hago un modelo de amenazas con STRIDE.

## Para la sesión de tutor

Trae tu modelo de amenazas. Haré de atacante con una sola pregunta por turno: "¿y si yo…?".
