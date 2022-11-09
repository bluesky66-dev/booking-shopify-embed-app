import { IProductModel } from "@models/product.model";
import BookingService from "@services/booking.service";
import ProductService from "@services/product.service";
import ScheduleService from "@services/schedule.service";
import mongoose from "mongoose";
import helpers, { ScheduleDate } from "./widget.helpers";

export enum ControllerMethods {
  staff = "staff",
  availabilityDay = "availabilityDay",
  availabilityRangeByStaff = "availabilityRangeByStaff",
  availabilityRangeByAll = "availabilityRangeByAll",
}

export interface Staff {
  _id: string;
  fullname: string;
}

export interface Hour {
  start: Date;
  end: Date;
  staff: Staff;
}

export interface AvailabilityReturn {
  date: string;
  hours: Hour[];
}

interface StaffQuery extends Pick<IProductModel, "productId" | "shop"> {}

const staff = async ({ query }: { query: StaffQuery }) => {
  const { productId, shop } = query;
  return await ProductService.getAllStaff({ shop, productId });
};

interface AvailabilityDayQuery
  extends Pick<IProductModel, "productId" | "shop"> {
  date: string;
  staffId: string;
}

const availabilityDay = async ({
  query,
}: {
  query: AvailabilityDayQuery;
}): Promise<Array<AvailabilityReturn>> => {
  const { staffId, date, productId, shop } = query;

  const product = await ProductService.getProductWithSelectedStaffId({
    shop,
    productId, //without shopify url
    staff: new mongoose.Types.ObjectId(staffId),
  });

  if (!product) {
    throw "no staff or product";
  }

  const schedules = await ScheduleService.getByStaffAndTag({
    tag: product.staff.tag,
    staff: product.staff.staff,
    start: date,
    end: date,
  });

  const bookings = await BookingService.getBookingsByProductAndStaff({
    shop,
    productId,
    start: new Date(date),
    end: new Date(date),
    staff: product.staff.staff,
  });

  let scheduleDates = schedules.reduce<Array<ScheduleDate>>(
    helpers.scheduleReduce(product),
    []
  );

  bookings.forEach(
    (book) =>
      (scheduleDates = scheduleDates.map(
        helpers.scheduleCalculateBooking(book)
      ))
  );

  return scheduleDates;
};

interface AvailabilityRangeByStaffQuery
  extends Pick<IProductModel, "productId" | "shop"> {
  staffId: string;
  start: string;
  end: string;
}

const availabilityRangeByStaff = async ({
  query,
}: {
  query: AvailabilityRangeByStaffQuery;
}): Promise<Array<AvailabilityReturn>> => {
  const { staffId, start, end, shop, productId } = query;

  const product = await ProductService.getProductWithSelectedStaffId({
    shop,
    productId,
    staff: new mongoose.Types.ObjectId(staffId),
  });

  if (!product) {
    throw "no staff or product";
  }

  const schedules = await ScheduleService.getByStaffAndTag({
    tag: product.staff.tag,
    staff: product.staff.staff,
    start,
    end,
  });

  const bookings = await BookingService.getBookingsByProductAndStaff({
    shop,
    productId,
    staff: product.staff.staff,
    start: new Date(start),
    end: new Date(end),
  });

  let scheduleDates = schedules.reduce(helpers.scheduleReduce(product), []);

  bookings.forEach(
    (book) =>
      (scheduleDates = scheduleDates.map(
        helpers.scheduleCalculateBooking(book)
      ))
  );

  return scheduleDates;
};

interface AvailabilityRangeByAllQuery
  extends Pick<IProductModel, "productId" | "shop"> {
  start: string;
  end: string;
}

const availabilityRangeByAll = async ({
  query,
}: {
  query: AvailabilityRangeByAllQuery;
}): Promise<Array<AvailabilityReturn>> => {
  const { start, end, shop, productId } = query;

  const product = await ProductService.findOne({
    shop,
    productId,
    active: true,
  });

  const schedules = await ScheduleService.getByTag({
    tag: product.staff.map((s) => s.tag),
    staffier: product.staff.map((s) => s.staff),
    start: new Date(start),
    end: new Date(end),
  });

  const bookings = await BookingService.getBookingsByProduct({
    shop,
    productId,
    start: new Date(start),
    end: new Date(end),
  });

  let scheduleDates = schedules.reduce(helpers.scheduleReduce(product), []);

  bookings.forEach(
    (book) =>
      (scheduleDates = scheduleDates.map(
        helpers.scheduleCalculateBooking(book)
      ))
  );

  return scheduleDates;
};

export default {
  staff,
  availabilityDay,
  availabilityRangeByAll,
  availabilityRangeByStaff,
};