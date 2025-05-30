-- AddColumn
ALTER TABLE "Order" ADD COLUMN     "orderPayments" TEXT[];

-- AlterColumn
ALTER TABLE "Order" ALTER COLUMN "paymentMethodType" DROP NOT NULL,
ALTER COLUMN "paymentMethodType" DROP DEFAULT;

-- CreateTable
CREATE TABLE "OrderPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentMethod" "PaymentMethodType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cashGiven" DOUBLE PRECISION,
    "cashChange" DOUBLE PRECISION,
    "checkNumber" TEXT,
    "checkBankName" TEXT,
    "checkDate" TIMESTAMP(3),
    "checkStatus" "CheckStatus",

    CONSTRAINT "OrderPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
