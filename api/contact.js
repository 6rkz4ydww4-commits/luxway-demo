export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Metodo non consentito" });
  }

  const { nome, email, tipo, messaggio, azienda } = req.body || {};

  if (azienda) {
    return res.status(200).json({ ok: true });
  }

  if (!nome || !email || !messaggio) {
    return res.status(400).json({ ok: false, error: "Campi mancanti" });
  }
  if (String(nome).length > 200 || String(email).length > 200 || String(messaggio).length > 5000) {
    return res.status(400).json({ ok: false, error: "Contenuto troppo lungo" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const destinatario = process.env.CONTACT_TO;
  const mittente = process.env.CONTACT_FROM || "ViaLux <onboarding@resend.dev>";

  if (!apiKey || !destinatario) {
    return res.status(500).json({ ok: false, error: "Modulo non configurato" });
  }

  const pulisci = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `
    <h2>Nuovo messaggio dal sito vialux.it</h2>
    <p><strong>Nome:</strong> ${pulisci(nome)}</p>
    <p><strong>Email:</strong> ${pulisci(email)}</p>
    <p><strong>Si presenta come:</strong> ${pulisci(tipo || "-")}</p>
    <p><strong>Messaggio:</strong></p>
    <p>${pulisci(messaggio).replace(/\n/g, "<br>")}</p>
  `;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mittente,
        to: [destinatario],
        reply_to: email,
        subject: `Sito ViaLux — messaggio da ${nome}`,
        html,
      }),
    });

    if (!r.ok) {
      const dettaglio = await r.text();
      console.error("Errore Resend:", r.status, dettaglio);
      return res.status(502).json({ ok: false, error: "Invio non riuscito" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Errore invio:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}
