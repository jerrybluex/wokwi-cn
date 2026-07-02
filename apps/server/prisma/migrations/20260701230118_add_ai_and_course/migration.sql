-- CreateTable
CREATE TABLE "AiCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiCall_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseSlug" TEXT NOT NULL,
    "stepIdx" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    CONSTRAINT "CourseProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AiCall_userId_createdAt_idx" ON "AiCall"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CourseProgress_userId_idx" ON "CourseProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseProgress_userId_courseSlug_key" ON "CourseProgress"("userId", "courseSlug");
