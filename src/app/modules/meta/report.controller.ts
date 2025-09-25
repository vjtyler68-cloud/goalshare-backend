import { Request, Response } from 'express';
import { ReportService } from './report.service';

const getUserReports = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const data = await ReportService.fetchUserReports(userId);
  res.status(200).json({
    success: true,
    message: 'User reports fetched successfully',
    data,
  });
};

export const ReportController = {
  getUserReports,
};
