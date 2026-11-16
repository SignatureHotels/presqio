import { Module } from "@nestjs/common";
import { InvitationsController, TeamController } from "./team.controller";
import { TeamService } from "./team.service";

@Module({ controllers: [TeamController, InvitationsController], providers: [TeamService], exports: [TeamService] })
export class TeamModule {}
