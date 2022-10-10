import { Layout, Page, Spinner } from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";
import { useAuthenticatedFetch } from "../../hooks";
import Collections from "../collections";

export default () => {
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<Array<Collection>>([]);
  const fetch = useAuthenticatedFetch();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/collections");
    const collections: Collections | null = await response.json();
    setCollections(collections.payload || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Page>
        <Layout>
          <Spinner accessibilityLabel="Spinner example" size="large" />
        </Layout>
      </Page>
    );
  }

  if (collections?.length === 0) {
    return <Collections.Empty></Collections.Empty>;
  }

  return <Collections.List collections={collections}></Collections.List>;
};