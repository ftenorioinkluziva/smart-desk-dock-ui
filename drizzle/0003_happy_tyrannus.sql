CREATE TABLE "productivity_sessions" (
	"user_id" text NOT NULL,
	"target" text NOT NULL,
	"mode" text,
	"total_seconds" integer NOT NULL,
	"is_running" boolean NOT NULL,
	"is_alert_visible" boolean NOT NULL,
	"sessions" integer NOT NULL,
	"end_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "productivity_sessions_user_id_target_pk" PRIMARY KEY("user_id","target")
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "dock_panel_order" jsonb;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "dock_hidden_panel_ids" jsonb;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "dock_initial_panel_id" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "dock_auto_rotate" boolean;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "primary_clock_label" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "primary_clock_timezone" text;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "secondary_clocks" jsonb;--> statement-breakpoint
ALTER TABLE "productivity_sessions" ADD CONSTRAINT "productivity_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;