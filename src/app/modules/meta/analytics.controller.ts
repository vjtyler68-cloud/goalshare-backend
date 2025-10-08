import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { MetaService } from './analytics.service';

const fetchDashboardMetaData = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await MetaService.fetchDashboardMetaData(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Meta data retrieval successfully!',
    data: result,
  });
});
const getReportTableData = catchAsync(async (req, res) => {
  const userId = req.user.id;
  // const { startDate, endDate } = req.query;
  const result = await MetaService.getReportTableData(
    userId,
    // startDate as string,
    // endDate as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Meta data retrieval successfully!',
    data: result,
  });
});

export const MetaController = {
  fetchDashboardMetaData,
  getReportTableData,
};
