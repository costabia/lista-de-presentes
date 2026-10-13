export const wedding = {
  brideName: process.env.NEXT_PUBLIC_BRIDE_NAME || "Marina",
  groomName: process.env.NEXT_PUBLIC_GROOM_NAME || "Gabriel",
  weddingDate: process.env.NEXT_PUBLIC_WEDDING_DATE || "2025-09-14",
  currency: "BRL",
  minimumCustomGift: 30,
  siteName: process.env.NEXT_PUBLIC_WEDDING_SITE_NAME || `${process.env.NEXT_PUBLIC_BRIDE_NAME || "Marina"} & ${process.env.NEXT_PUBLIC_GROOM_NAME || "Gabriel"}`,
} as const;
