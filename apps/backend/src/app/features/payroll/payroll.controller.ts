import type { Response } from 'express';
import { Body, Controller, Delete, Get, HttpCode, Param, Query, Res, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentBusiness, CurrentOrganization, CurrentUser, OrganizationRoles } from '../../common/auth/auth.decorators';
import type { BusinessContext, OrganizationContext, RequestUser } from '../../common/auth/auth.types';
import { OrganizationAccessGuard } from '../../common/auth/organization-access.guard';
import { BusinessAccessGuard } from '../../common/auth/business-access.guard';
import { PayrollApproveDto, PayrollBulkPaymentDto, PayrollLogoDto, PayrollMonthDto, PayrollPeriodDto, PayrollPaymentDto, PayrollReviewDto, PayrollSettingsDto, SaveCompensationDto } from './payroll.dto';
import { PayrollService } from './payroll.service';

@ApiTags('Payroll') @ApiBearerAuth()
@OrganizationRoles('OWNER','ADMIN')
@UseGuards(OrganizationAccessGuard,BusinessAccessGuard)
@Controller('organizations/:organizationId/businesses/:businessId/payroll')
export class PayrollController {
  constructor(private readonly payroll:PayrollService) {}
  @Get('setup') setup(@CurrentBusiness() b:BusinessContext) { return this.payroll.setup(b.businessId); }
  @Post('logo') uploadLogo(@CurrentBusiness() b:BusinessContext,@Body() dto:PayrollLogoDto) { return this.payroll.uploadLogo(b.businessId,dto.dataUrl); }
  /** Logo bytes for payslips; ids are never reused, so the response can be cached. */
  @Get('logos/:logo') async logo(@CurrentBusiness() b:BusinessContext,@Param('logo') logo:string,@Res() res:Response) {
    const file = await this.payroll.logo(b.businessId,logo);
    res.set('Cache-Control','private, max-age=31536000, immutable').type(file.contentType).send(file.data);
  }
  @Put('settings') settings(@CurrentOrganization() o:OrganizationContext,@CurrentBusiness() b:BusinessContext,@CurrentUser() u:RequestUser,@Body() dto:PayrollSettingsDto) { return this.payroll.settings(o.organizationId,b.businessId,u.userId,dto); }
  @Put('compensations') compensation(@CurrentOrganization() o:OrganizationContext,@CurrentBusiness() b:BusinessContext,@CurrentUser() u:RequestUser,@Body() dto:SaveCompensationDto) { return this.payroll.compensation(o.organizationId,b.businessId,u.userId,dto); }
  @Get('employees/:employeeId') employee(@CurrentBusiness() b:BusinessContext,@Param('employeeId',ParseUUIDPipe) id:string) { return this.payroll.employeeDetails(b.businessId,id); }
  @Get('preview') preview(@CurrentBusiness() b:BusinessContext,@Query() q:PayrollPeriodDto) { return this.payroll.preview(b.businessId,q.from,q.to); }
  @Get('runs') list(@CurrentBusiness() b:BusinessContext) { return this.payroll.list(b.businessId); }
  @Post('runs') create(@CurrentOrganization() o:OrganizationContext,@CurrentBusiness() b:BusinessContext,@CurrentUser() u:RequestUser,@Body() dto:PayrollMonthDto) { return this.payroll.create(o.organizationId,b.businessId,u.userId,dto.month); }
  @Get('runs/:runId') get(@CurrentBusiness() b:BusinessContext,@Param('runId',ParseUUIDPipe) id:string) { return this.payroll.get(b.businessId,id); }
  @Post('runs/:runId/refresh') refresh(@CurrentOrganization() o:OrganizationContext,@CurrentBusiness() b:BusinessContext,@CurrentUser() u:RequestUser,@Param('runId',ParseUUIDPipe) id:string) { return this.payroll.refresh(o.organizationId,b.businessId,u.userId,id); }
  @Post('runs/:runId/approve-clean') approveClean(@CurrentOrganization() o:OrganizationContext,@CurrentBusiness() b:BusinessContext,@CurrentUser() u:RequestUser,@Param('runId',ParseUUIDPipe) id:string,@Body() dto:PayrollApproveDto) { return this.payroll.approveClean(o.organizationId,b.businessId,u.userId,id,dto.note,dto.itemIds); }
  @Post('runs/:runId/payments') bulkPayment(@CurrentOrganization() o:OrganizationContext,@CurrentBusiness() b:BusinessContext,@CurrentUser() u:RequestUser,@Param('runId',ParseUUIDPipe) id:string,@Body() dto:PayrollBulkPaymentDto) { return this.payroll.bulkPayment(o.organizationId,b.businessId,u.userId,id,dto); }
  @Delete('runs/:runId') @HttpCode(204) remove(@CurrentOrganization() o:OrganizationContext,@CurrentBusiness() b:BusinessContext,@CurrentUser() u:RequestUser,@Param('runId',ParseUUIDPipe) id:string) { return this.payroll.remove(o.organizationId,b.businessId,u.userId,id); }
  @Put('runs/:runId/items/:itemId/review') review(@CurrentOrganization() o:OrganizationContext,@CurrentBusiness() b:BusinessContext,@CurrentUser() u:RequestUser,@Param('runId',ParseUUIDPipe) id:string,@Param('itemId',ParseUUIDPipe) item:string,@Body() dto:PayrollReviewDto) { return this.payroll.review(o.organizationId,b.businessId,u.userId,id,item,dto); }
  @Post('runs/:runId/finalize') finalize(@CurrentOrganization() o:OrganizationContext,@CurrentBusiness() b:BusinessContext,@CurrentUser() u:RequestUser,@Param('runId',ParseUUIDPipe) id:string) { return this.payroll.finalize(o.organizationId,b.businessId,u.userId,id); }
  @Post('runs/:runId/items/:itemId/payments') payment(@CurrentOrganization() o:OrganizationContext,@CurrentBusiness() b:BusinessContext,@CurrentUser() u:RequestUser,@Param('runId',ParseUUIDPipe) id:string,@Param('itemId',ParseUUIDPipe) item:string,@Body() dto:PayrollPaymentDto) { return this.payroll.payment(o.organizationId,b.businessId,u.userId,id,item,dto); }
}
