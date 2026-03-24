-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'MEMBER');

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('EMAIL', 'GOOGLE', 'APPLE', 'LINE');

-- CreateEnum
CREATE TYPE "member_type" AS ENUM ('DANKA', 'GOEN');

-- CreateEnum
CREATE TYPE "referral_source" AS ENUM ('SNS', 'WEB', 'EVENT', 'INTRODUCTION', 'WALK_IN', 'OTHER');

-- CreateEnum
CREATE TYPE "reservation_type" AS ENUM ('ANNUAL_MEMORIAL', 'MONTHLY_MEMORIAL', 'NIBON', 'KUYO', 'FUNERAL', 'OTHER');

-- CreateEnum
CREATE TYPE "reservation_status" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "event_category" AS ENUM ('ZAZEN', 'SHAKYO', 'YOGA', 'MINDFULNESS', 'LECTURE', 'SEASONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "event_visibility" AS ENUM ('PUBLIC', 'MEMBERS_ONLY', 'DANKA_ONLY');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "participation_status" AS ENUM ('APPLIED', 'CONFIRMED', 'WAITLISTED', 'ATTENDED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ofuse_type" AS ENUM ('HOUYO', 'GOJIKAI', 'KIFU', 'EVENT_FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'TRANSFER', 'ONLINE');

-- CreateEnum
CREATE TYPE "gojikai_status" AS ENUM ('UNPAID', 'PAID', 'EXEMPT');

-- CreateEnum
CREATE TYPE "announcement_target" AS ENUM ('ALL', 'DANKA', 'GOEN');

-- CreateTable
CREATE TABLE "temples" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "denomination" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "temples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'MEMBER',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "authProvider" "auth_provider" NOT NULL DEFAULT 'EMAIL',
    "pushToken" TEXT,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "member_type" NOT NULL DEFAULT 'GOEN',
    "familyName" TEXT NOT NULL,
    "address" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "joinedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interestTags" JSONB,
    "referralSource" "referral_source",
    "engagementScore" INTEGER NOT NULL DEFAULT 0,
    "promotedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deceased_persons" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kaimyo" TEXT,
    "deathDate" TIMESTAMP(3),
    "birthDate" TIMESTAMP(3),
    "relationship" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deceased_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "reservation_type" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "deceasedPersonId" TEXT,
    "status" "reservation_status" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "event_category" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "visibility" "event_visibility" NOT NULL DEFAULT 'PUBLIC',
    "imageUrl" TEXT,
    "shareUrl" TEXT,
    "status" "event_status" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_participations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "numGuests" INTEGER NOT NULL DEFAULT 1,
    "status" "participation_status" NOT NULL DEFAULT 'APPLIED',
    "paymentStatus" "payment_status" NOT NULL DEFAULT 'NOT_REQUIRED',
    "paymentAmount" INTEGER NOT NULL DEFAULT 0,
    "feedbackScore" INTEGER,
    "feedbackComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ofuse" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "reservationId" TEXT,
    "type" "ofuse_type" NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "payment_method" NOT NULL DEFAULT 'CASH',
    "receiptIssued" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ofuse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gojikai_rules" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueMonth" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gojikai_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gojikai_payments" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "gojikai_status" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gojikai_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetSegment" "announcement_target" NOT NULL DEFAULT 'ALL',
    "publishedAt" TIMESTAMP(3),
    "pushSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_events" (
    "id" TEXT NOT NULL,
    "templeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annual_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_interactions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "staffNote" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_userId_key" ON "members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "event_participations_eventId_memberId_key" ON "event_participations"("eventId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "gojikai_payments_memberId_fiscalYear_key" ON "gojikai_payments"("memberId", "fiscalYear");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "temples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "temples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deceased_persons" ADD CONSTRAINT "deceased_persons_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "temples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_deceasedPersonId_fkey" FOREIGN KEY ("deceasedPersonId") REFERENCES "deceased_persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "temples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participations" ADD CONSTRAINT "event_participations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_participations" ADD CONSTRAINT "event_participations_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofuse" ADD CONSTRAINT "ofuse_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "temples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofuse" ADD CONSTRAINT "ofuse_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ofuse" ADD CONSTRAINT "ofuse_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gojikai_rules" ADD CONSTRAINT "gojikai_rules_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "temples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gojikai_payments" ADD CONSTRAINT "gojikai_payments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "temples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_events" ADD CONSTRAINT "annual_events_templeId_fkey" FOREIGN KEY ("templeId") REFERENCES "temples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_interactions" ADD CONSTRAINT "member_interactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
