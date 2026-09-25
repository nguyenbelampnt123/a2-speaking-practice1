import "./globals.css";

export const metadata = {
  title: "A2 Speaking Review – MR. NGUYỄN BÉ LÂM",
  description: "Bản dùng thử – A2 English Speaking Review"
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}