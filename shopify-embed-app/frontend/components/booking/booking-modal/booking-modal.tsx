import {
    LoadingSpinner,
    ModalProvider,
    useBookingGet,
} from "@jamalsoueidan/pkg.frontend";
import { Card, Tabs } from "@shopify/polaris";
import { isAfter } from "date-fns";
import { lazy, useCallback, useMemo } from "react";
import {
    Route,
    Routes,
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";
import { BookingDetailsEdit } from "../booking-details/booking-details-edit";
import { BookingNotifications } from "../booking-details/booking-notifications";
import { BookingSendNotification } from "../booking-details/booking-send-notification";

const BookingCustomer = lazy(() =>
  import("@jamalsoueidan/pkg.frontend").then((module) => ({
    default: module.BookingCustomer,
  })),
);

const BookingDetailsView = lazy(() =>
  import("@jamalsoueidan/pkg.frontend").then((module) => ({
    default: module.BookingView,
  })),
);

export const BookingModal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id: string; "*": string }>();

  const { data } = useBookingGet({ id: params.id });

  const onClose = useCallback(() => {
    navigate("../", { relative: "route" });
  }, [navigate]);

  const tabs = useMemo(() => {
    const t = [
      {
        content: "Behandling",
        id: "",
      },
      {
        content: "Kunde",
        id: "customer",
      },
      {
        content: "Meddelelser",
        id: "notifications",
      },
    ];

    if (
      (!data?.fulfillmentStatus || data?.isSelfBooked) &&
      isAfter(new Date(data?.start || ""), new Date())
    ) {
      t.push({
        content: "Send Meddelelser",
        id: "send",
      });
    }

    return t;
  }, [data]);

  const handleTabChange = useCallback(
    (selectedTabIndex: number) => {
      navigate(tabs[selectedTabIndex].id || "", {
        relative: "route",
        state: tabs[selectedTabIndex].id,
      });
    },
    [navigate, tabs],
  );

  const selected = useMemo(
    () => tabs.findIndex((t) => t.id === location.state),
    [tabs, location],
  );

  return (
    <ModalProvider large open={true} onClose={onClose} title={data?.title}>
      <Card>
        <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
          {!data ? (
            <LoadingSpinner />
          ) : (
            <Routes>
              <Route
                index
                element={
                  <BookingDetailsView booking={data} navigate={navigate} />
                }
              />
              <Route
                path="edit"
                element={<BookingDetailsEdit booking={data} />}
              />
              <Route
                path="customer"
                element={<BookingCustomer booking={data} />}
              />
              <Route
                path="notifications"
                element={<BookingNotifications booking={data} />}
              />
              <Route
                path="send"
                element={<BookingSendNotification booking={data} />}
              />
            </Routes>
          )}
        </Tabs>
      </Card>
    </ModalProvider>
  );
};
