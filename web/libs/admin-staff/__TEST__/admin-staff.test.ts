import { createStaff } from "@libs/jest-helpers";
import mongoose from "mongoose";
import staffController from "../admin-staff.controller";

describe("Admin-staff controller", () => {
  beforeAll(() => mongoose.connect(global.__MONGO_URI__));
  afterAll(() => mongoose.connection.close());
  afterEach(() => mongoose.connection.db.dropDatabase());

  it("Should create a staff", async () => {
    const query = {
      shop: global.shop,
    };

    const body = {
      fullname: "jamasdeidan",
      email: "test@test.com",
      phone: "+4531317428",
    };

    const createSetting = await staffController.create({ query, body });
    expect(createSetting.fullname).toEqual(body.fullname);
  });

  it("Should get list of staff", async () => {
    const query = {
      shop: global.shop,
    };

    await createStaff("333");
    const staff = await staffController.get({ query });
    expect(staff.length).toEqual(1);
  });

  it("Should update staff", async () => {
    const query = {
      shop: global.shop,
    };

    await createStaff("222");

    const staff = await staffController.get({ query });
    const user = staff[0];

    const body = {
      fullname: "jamal soueidan",
    };

    const updateStaff = await staffController.update({
      query: {
        staff: staff[0]._id.toString(),
      },
      body,
    });
    expect(updateStaff.fullname).toEqual(body.fullname);
  });

  it("Should get one staff by id", async () => {
    const query = {
      shop: global.shop,
    };

    await createStaff("111");

    const staff = await staffController.get({ query });

    const oneStaff = await staffController.getById({
      query: {
        ...query,
        staff: staff[0]._id.toString(),
      },
    });
    expect(oneStaff._id).toEqual(staff[0]._id);
  });
});