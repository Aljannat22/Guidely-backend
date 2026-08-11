/**
 * Push notification service.
 *
 * Until FCM_SERVER_KEY is set, this just logs — so registering tokens
 * and toggling reminders works end-to-end without a push provider.
 *
 * To go live:
 * 1. Create a Firebase project → Cloud Messaging → grab the server key.
 * 2. Put it in FCM_SERVER_KEY in .env.
 * 3. Uncomment the fetch call below (or swap in `firebase-admin`).
 * 4. Add a scheduled job (cron, or a hosted scheduler like Railway Cron /
 *    a serverless cron trigger) that, once a day, queries users where
 *    notifEnabled = true and notifTime matches the current hour, and
 *    calls sendPushNotification for each of their tokens with their
 *    next incomplete task.
 */

async function sendPushNotification(token, { title, body }) {
  if (!process.env.FCM_SERVER_KEY) {
    console.log(`[notificationService] (stub) would push to ${token}: "${title}" — ${body}`);
    return { ok: true, stub: true };
  }

  // Example real implementation (FCM legacy HTTP API):
  //
  // const res = await fetch("https://fcm.googleapis.com/fcm/send", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `key=${process.env.FCM_SERVER_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     to: token,
  //     notification: { title, body },
  //   }),
  // });
  // return res.json();

  return { ok: true, stub: true };
}

module.exports = { sendPushNotification };
