import { Controller, Get } from '@nestjs/common';
import { Public } from '@bdoea-fs/auth';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Public()
  async getDashboard() {
    try {
      return await this.dashboardService.getDashboardData();
    } catch (error) {
      return {
        error: 'Error occurred in getDashboardData',
        message: error.message,
        stack: error.stack
      };
    }
  }
}
