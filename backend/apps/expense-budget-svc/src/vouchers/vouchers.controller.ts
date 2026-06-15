import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VouchersService } from './vouchers.service';
import { ReceiptService } from './receipt.service';
import { Public, Roles } from '@bdoea-fs/auth';

@Controller('vouchers')
export class VouchersController {
  constructor(
    private readonly vouchersService: VouchersService,
    private readonly receiptService: ReceiptService,
  ) {}

  @Get()
  @Public()
  findAll(@Query('status') status?: string) {
    return this.vouchersService.findAll(status);
  }

  @Post()
  @Public()
  create(@Body() data: any, @Request() req: any) {
    const user = req.user?.username || 'Treasurer'; // Fallback if user info isn't attached
    return this.vouchersService.create(data, user);
  }

  @Put(':id')
  @Public()
  update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    const user = req.user?.username || 'Treasurer';
    return this.vouchersService.update(id, data, user);
  }

  @Delete(':id')
  @Public()
  delete(@Param('id') id: string, @Request() req: any) {
    const user = req.user?.username || 'Treasurer';
    return this.vouchersService.delete(id, user);
  }

  @Patch(':id/approve')
  @Public()
  approveOrReject(
    @Param('id') id: string,
    @Body('decision') decision: 'APPROVED' | 'REJECTED',
    @Request() req: any,
  ) {
    const authorizedBy = req.user?.username || 'Approver';
    return this.vouchersService.approveOrReject(id, decision, authorizedBy);
  }

  @Patch(':id/post')
  @Public()
  postVoucher(@Param('id') id: string, @Request() req: any) {
    const user = req.user?.username || 'Treasurer';
    return this.vouchersService.post(id, user);
  }

  @Post(':id/receipt')
  @Public()
  @UseInterceptors(FileInterceptor('receipt', { storage: memoryStorage() }))
  uploadReceipt(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.receiptService.uploadReceipt(id, file);
  }
}
