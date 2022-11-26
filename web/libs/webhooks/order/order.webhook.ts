import BookingModel, { IBookingModel } from "@models/booking.model";
import ProductModel, { IProductModel } from "@models/product.model";
import CustomerService from "@services/customer.service";
import SmsService from "@services/sms.service";
import { addMinutes } from "date-fns";
import mongoose from "mongoose";

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

interface ModifyProps {
  body: OrderTypes.Order;
  shop: string;
  sendBooking?: boolean;
}

const modify = async ({
  body,
  shop,
  sendBooking,
}: ModifyProps): Promise<Array<IBookingModel>> => {
  const orderId = body.id;
  const filter = (lineItem) =>
    lineItem.properties.find((property) => property.name === "_data");

  const lineItems = body.line_items.filter(filter);

  const boughtProductTitles = [];

  let models = lineItems.map((lineItem) => {
    const _data = lineItem.properties.find((p) => p.name === "_data")?.value;
    if (_data) {
      const data: OrderTypes.Data = JSON.parse(_data);
      const staffId = data.staff.staff;
      const anyStaff = data.staff.anyStaff;
      const completeDate = new Date(data.start);

      boughtProductTitles.push(lineItem.title);

      return {
        orderId,
        productId: lineItem.product_id,
        staff: new mongoose.Types.ObjectId(staffId),
        start: completeDate,
        end: new Date(),
        shop,
        anyStaff,
        customerId: body.customer.id,
      } as IBookingModel;
    }
  });

  const query = {
    shop,
    productId: models.map((model) => model.productId).filter(onlyUnique),
  };

  const products = await ProductModel.find<IProductModel>(query);

  models = models.map((model) => {
    const product = products.find(
      (product) => product.productId === model.productId
    );
    // TODO: validate time?
    return {
      ...model,
      end: addMinutes(model.start, product.duration),
    };
  });

  const customer = await CustomerService.findCustomerAndUpdate({
    shop,
    customerId: body.customer.id,
    customerGraphqlApiId: body.customer.admin_graphql_api_id,
  });

  SmsService.sendBookingConfirmation({ customer, boughtProductTitles });
  SmsService.sendReminder({ customer, bookings: models });

  await BookingModel.deleteMany({ orderId, shop });
  return await BookingModel.insertMany(models);
};

interface CreateProps {
  body: OrderTypes.Order;
  shop: string;
}

const create = async ({ body, shop }: CreateProps) =>
  await modify({ body, shop, sendBooking: true });

interface UpdateProps {
  body: OrderTypes.Order;
  shop: string;
}

const update = async ({ body, shop }: UpdateProps) =>
  await modify({ body, shop });

interface CancelProps {
  body: OrderTypes.Order;
  shop: string;
}

const cancel = async ({ body, shop }: CancelProps) => {
  return await BookingModel.updateMany(
    { orderId: body.id, shop },
    { cancelled: true }
  );
};

export default { create, update, cancel };