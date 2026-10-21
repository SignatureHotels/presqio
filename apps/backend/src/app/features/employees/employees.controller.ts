import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { EmployeeRecord } from "@presqio/lib";
import {
  BusinessRoles,
  CurrentBusiness,
  CurrentOrganization,
  CurrentUser,
} from "../../common/auth/auth.decorators";
import type {
  BusinessContext,
  OrganizationContext,
  RequestUser,
} from "../../common/auth/auth.types";
import { BusinessAccessGuard } from "../../common/auth/business-access.guard";
import { OrganizationAccessGuard } from "../../common/auth/organization-access.guard";
import { CreateEmployeeDto, UpdateEmployeeDto } from "./dto/employee.dto";
import { EmployeesService } from "./employees.service";

@ApiTags("Employees")
@ApiBearerAuth()
@UseGuards(OrganizationAccessGuard, BusinessAccessGuard)
@Controller("organizations/:organizationId/businesses/:businessId/employees")
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  list(@CurrentBusiness() business: BusinessContext): Promise<EmployeeRecord[]> {
    return this.employees.list(business.businessId);
  }

  @BusinessRoles("BUSINESS_ADMIN", "BRANCH_MANAGER")
  @Post()
  create(
    @CurrentOrganization() org: OrganizationContext,
    @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateEmployeeDto,
  ): Promise<EmployeeRecord> {
    return this.employees.create(org, business.businessId, user, dto);
  }

  @BusinessRoles("BUSINESS_ADMIN", "BRANCH_MANAGER")
  @Patch(":employeeId")
  update(
    @CurrentOrganization() org: OrganizationContext,
    @CurrentBusiness() business: BusinessContext,
    @CurrentUser() user: RequestUser,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeRecord> {
    return this.employees.update(org, business.businessId, user, employeeId, dto);
  }

  /** Check-in/out selfie (image bytes). Never cached: it is personal evidence. */
  @Get("photos/:attemptId")
  @Header("Cache-Control", "private, no-store")
  async photo(
    @CurrentBusiness() business: BusinessContext,
    @Param("attemptId", ParseUUIDPipe) attemptId: string,
    @Res() res: Response,
  ) {
    const photo = await this.employees.photo(business.businessId, attemptId);
    res.type(photo.contentType).send(Buffer.from(photo.data));
  }
}
