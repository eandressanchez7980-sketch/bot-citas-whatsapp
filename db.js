const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://aeohfgkiopqrvporacvy.supabase.co/rest/v1/",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlb2hmZ2tpb3BxcnZwb3JhY3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMjQ4MzYsImV4cCI6MjA5NDgwMDgzNn0.djlfiZOpXoJxP3zlrV5IomAlIJquL0r6WQ5SY2wHs88"
);

//  guardar cita
async function saveAppointment(phone, service, date, time) {
  const { data, error } = await supabase
    .from("appointments")
    .insert([
      {
        phone,
        service,
        date,
        time,
        status: "confirmed"
      }
    ]);

  if (error) {
    console.log("Error guardando cita:", error.message);
  }

  return data;
}

//  verificar disponibilidad
async function isAvailable(date, time) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("date", date)
    .eq("time", time);

  if (error) {
    console.log("Error consultando disponibilidad:", error.message);
    return false;
  }

  return data.length === 0;
}

module.exports = {
  saveAppointment,
  isAvailable
};