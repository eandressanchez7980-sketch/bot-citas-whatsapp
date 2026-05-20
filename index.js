const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

// 🔗 CONEXIÓN A BASE DE DATOS
const { saveAppointment, isAvailable } = require("./db");

const app = express();
app.use(bodyParser.json());

// ==========================
// MEMORIA SIMPLE DEL USUARIO
// ==========================
const sessions = {};

// ==========================
// VERIFICACIÓN WEBHOOK
// ==========================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("Webhook verificado ✔");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ==========================
// RECIBIR MENSAJES WHATSAPP
// ==========================
app.post("/webhook", async (req, res) => {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (!msg) return res.sendStatus(200);

  const from = msg.from;
  const text = msg.text?.body?.toLowerCase();

  // crear sesión si no existe
  if (!sessions[from]) {
    sessions[from] = { step: 0, data: {} };
  }

  const session = sessions[from];

  let reply = "";

  // ==========================
  // INICIO
  // ==========================
  if (text === "hola") {
    session.step = 0;
    reply = "👋 Hola! Bienvenido al sistema de citas.\nEscribe 1 para agendar una cita.";
  }

  // ==========================
  // PASO 1: MENÚ
  // ==========================
  else if (text === "1" && session.step === 0) {
    session.step = 1;
    reply = "📅 ¿Qué servicio necesitas?";
  }

  // ==========================
  // PASO 2: SERVICIO
  // ==========================
  else if (session.step === 1) {
    session.data.service = text;
    session.step = 2;
    reply = "📆 ¿Qué fecha? (ej: 2026-05-20)";
  }

  // ==========================
  // PASO 3: FECHA
  // ==========================
  else if (session.step === 2) {
    session.data.date = text;
    session.step = 3;
    reply = "⏰ ¿Qué hora? (ej: 3pm)";
  }

  // ==========================
  // PASO 4: HORA + BASE DE DATOS
  // ==========================
  else if (session.step === 3) {
    session.data.time = text;

    const { service, date } = session.data;

    // 🔥 AQUÍ SE USA LA BASE DE DATOS
    const available = await isAvailable(date, text);

    if (!available) {
      reply = "❌ Ese horario ya está ocupado. Elige otro.";
      session.step = 2;
    } else {
      await saveAppointment(from, service, date, text);

      reply = "✅ Cita confirmada correctamente.";

      // reset sesión
      sessions[from] = { step: 0, data: {} };
    }
  }

  // fallback
  else {
    reply = "Escribe 'hola' para comenzar.";
  }

  await sendMessage(from, reply);

  res.sendStatus(200);
});

// ==========================
// ENVIAR MENSAJE WHATSAPP
// ==========================
async function sendMessage(to, message) {
  const url = `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

// ==========================
app.listen(process.env.PORT || 3000, () => {
  console.log("Bot corriendo ✔");
});
