interface Props {
  value: string;
  size?: number;
}

export function QRCodeDisplay({ value, size = 280 }: Props) {
  const encoded = encodeURIComponent(value);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  return (
    <div style={{
      marginTop: "1rem",
      display: "inline-block",
      padding: "8px",
      border: "1px solid #ccc",
      borderRadius: "4px",
      backgroundColor: "#fff",
    }}>
      <img src={src} alt="QR code" width={size} height={size} />
    </div>
  );
}
