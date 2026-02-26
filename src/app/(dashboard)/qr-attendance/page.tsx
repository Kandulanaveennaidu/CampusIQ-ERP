import { redirect } from "next/navigation";

export default function QRAttendanceRedirect() {
  redirect("/attendance/qr");
}
