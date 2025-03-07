import { Response } from "express"; // Ensure correct import

const sendResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data: any = null,
  error: any = null,
  success: boolean = statusCode >= 200 && statusCode < 300
): Response => {
  return res
    .status(statusCode)
    .json({ statusCode, success, message, data, error });
};

export default sendResponse;
