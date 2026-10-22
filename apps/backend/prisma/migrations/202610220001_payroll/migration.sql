-- CreateTable
CREATE TABLE "employee_payroll_profiles" (
    "employee_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "date_of_birth" DATE,
    "pan" TEXT NOT NULL DEFAULT '',
    "uan" TEXT NOT NULL DEFAULT '',
    "esi" TEXT NOT NULL DEFAULT '',
    "bank_name" TEXT NOT NULL DEFAULT '',
    "bank_account" TEXT NOT NULL DEFAULT '',
    "last_working_date" DATE,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_payroll_profiles_pkey" PRIMARY KEY ("employee_id")
);

-- CreateTable
CREATE TABLE "payroll_settings" (
    "business_id" UUID NOT NULL,
    "settings_json" JSONB NOT NULL,

    CONSTRAINT "payroll_settings_pkey" PRIMARY KEY ("business_id")
);

-- CreateTable
CREATE TABLE "payroll_compensations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "effective_month" DATE NOT NULL,
    "earnings_json" JSONB NOT NULL,
    "deductions_json" JSONB NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_compensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_by" UUID,
    "finalized_at" TIMESTAMPTZ(3),

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "review_json" JSONB NOT NULL,
    "reviewed_by" UUID,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "reference" TEXT NOT NULL,
    "paid_on" DATE NOT NULL,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_payroll_profiles_business_id_employee_id_key" ON "employee_payroll_profiles"("business_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_compensations_business_id_employee_id_effective_mon_key" ON "payroll_compensations"("business_id", "employee_id", "effective_month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_business_id_month_key" ON "payroll_runs"("business_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_business_id_id_key" ON "payroll_runs"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_items_business_id_run_id_employee_id_key" ON "payroll_items"("business_id", "run_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_items_business_id_id_key" ON "payroll_items"("business_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payments_business_id_item_id_reference_key" ON "payroll_payments"("business_id", "item_id", "reference");

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_profiles" ADD CONSTRAINT "employee_payroll_profiles_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_settings" ADD CONSTRAINT "payroll_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_compensations" ADD CONSTRAINT "payroll_compensations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_compensations" ADD CONSTRAINT "payroll_compensations_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_business_id_run_id_fkey" FOREIGN KEY ("business_id", "run_id") REFERENCES "payroll_runs"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_business_id_employee_id_fkey" FOREIGN KEY ("business_id", "employee_id") REFERENCES "employees"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_payments" ADD CONSTRAINT "payroll_payments_business_id_item_id_fkey" FOREIGN KEY ("business_id", "item_id") REFERENCES "payroll_items"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Keep final payroll immutable even when changes bypass the HTTP API.
ALTER TABLE payroll_runs ADD CONSTRAINT payroll_run_status_check CHECK (
  (status = 'DRAFT' AND finalized_at IS NULL AND finalized_by IS NULL)
  OR (status = 'FINALIZED' AND finalized_at IS NOT NULL AND finalized_by IS NOT NULL)
);
ALTER TABLE payroll_payments ADD CONSTRAINT payroll_payment_positive CHECK (amount > 0 AND amount <= 100000000000);
CREATE FUNCTION protect_finalized_payroll_run() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'FINALIZED' THEN RAISE EXCEPTION 'Finalized payroll cannot be changed'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payroll_run_immutable BEFORE UPDATE OR DELETE ON payroll_runs
FOR EACH ROW EXECUTE FUNCTION protect_finalized_payroll_run();
CREATE FUNCTION protect_finalized_payroll_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run_status text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT status INTO run_status FROM payroll_runs WHERE id = OLD.run_id FOR UPDATE;
    IF run_status = 'FINALIZED' THEN RAISE EXCEPTION 'Finalized payroll cannot be changed'; END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT status INTO run_status FROM payroll_runs WHERE id = NEW.run_id FOR UPDATE;
    IF run_status = 'FINALIZED' THEN RAISE EXCEPTION 'Finalized payroll cannot be changed'; END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER payroll_item_immutable BEFORE INSERT OR UPDATE OR DELETE ON payroll_items
FOR EACH ROW EXECUTE FUNCTION protect_finalized_payroll_item();
CREATE FUNCTION protect_payroll_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run_status text;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Payment records are append only'; END IF;
  SELECT r.status INTO run_status FROM payroll_items i JOIN payroll_runs r ON r.id = i.run_id WHERE i.id = NEW.item_id FOR UPDATE OF r;
  IF run_status <> 'FINALIZED' THEN RAISE EXCEPTION 'Payments require finalized payroll'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payroll_payment_immutable BEFORE INSERT OR UPDATE OR DELETE ON payroll_payments
FOR EACH ROW EXECUTE FUNCTION protect_payroll_payment();
