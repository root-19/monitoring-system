import { toE164 } from "./gas";

/** Deep link that opens the phone's SMS app with the number and text prefilled (works on Android and iOS). */
export function smsLink(phone: string, body: string) {
  return `sms:${toE164(phone)}?&body=${encodeURIComponent(body)}`;
}
