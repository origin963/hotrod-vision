export async function handler(event) {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ok: true,
      function: "create-checkout-session",
      method: event.httpMethod,
      note: "If you can see this, Netlify is loading functions correctly."
    }),
  };
}