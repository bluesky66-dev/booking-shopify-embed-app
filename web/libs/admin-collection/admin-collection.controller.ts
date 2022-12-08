import CollectionModel from "@models/Collection.model";
import ProductModel, { IProductModel } from "@models/Product.model";
import CollectionService from "@services/Collection.service";
import { Session } from "@shopify/shopify-api/dist/auth/session";
import { getCollection } from "./admin-collection.helpers";

export enum ControllerMethods {
  get = "get",
  create = "create",
  remove = "remove",
}

interface CreateQuery {
  session: Session;
  shop: string;
}

interface CreateBody {
  selections: string[];
}

const create = async ({
  query,
  body,
}: {
  query: CreateQuery;
  body: CreateBody;
}) => {
  const { session, shop } = query;

  const selections = body.selections;
  const collections = await Promise.all(
    selections.map((id) => getCollection(session, id))
  );

  const getGid = (value: string): number =>
    parseInt(value.substring(value.lastIndexOf("/") + 1));

  const collectionBulkWrite = collections.map((c) => {
    return {
      updateOne: {
        filter: { collectionId: getGid(c.id) },
        update: {
          $set: { shop, title: c.title, collectionId: getGid(c.id) },
        },
        upsert: true,
      },
    };
  });

  const products = collections.reduce<Array<Partial<IProductModel>>>(
    (products, currentCollection) => {
      currentCollection.products.nodes.forEach((n) => {
        products.push({
          shop,
          collectionId: getGid(currentCollection.id),
          productId: getGid(n.id),
          title: n.title,
        });
      });
      return products;
    },
    []
  );

  const productsBulkWrite = products.map((product) => {
    return {
      updateOne: {
        filter: { productId: product.productId },
        update: {
          $set: product,
        },
        upsert: true,
      },
    };
  });

  return {
    collections: await CollectionModel.bulkWrite(collectionBulkWrite),
    products: await ProductModel.bulkWrite(productsBulkWrite),
  };

  return {};
};

interface DeleteQuery {
  shop: String;
  id: string;
}

const remove = async ({ query }: { query: DeleteQuery }) => {
  const { shop, id } = query;

  const collection = await CollectionService.findOne({ shop, _id: id });

  if (collection) {
    return {
      collection: await CollectionModel.deleteOne({ shop, _id: id }),
      products: await ProductModel.deleteMany({
        collectionId: collection.collectionId,
      }),
    };
  }
};

const get = async () => {
  return await CollectionService.findAll();
};

export default { create, get, remove };
