CREATE TABLE "suggestion_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"tolgee_suggestion_id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suggestion_votes_user_suggestion" UNIQUE("user_id","tolgee_suggestion_id")
);
--> statement-breakpoint
ALTER TABLE "suggestion_votes" ADD CONSTRAINT "suggestion_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;