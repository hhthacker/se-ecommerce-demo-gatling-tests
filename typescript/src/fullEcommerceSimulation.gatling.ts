import {
  simulation,
  scenario,
  group,
  pause,
  atOnceUsers,
  rampUsersPerSec,
  constantUsersPerSec,
  nothingFor,
  global,
  feed,
  Session
} from "@gatling.io/core";
import { http } from "@gatling.io/http";
import {
  homeAnonymous,
  authenticate,
  homeAuthenticated,
  addToCart,
  buy,
  productsFeeder
} from "./groups/scenarioGroups";
import { baseUrl, minPauseSec, maxPauseSec } from "./utils/config";
import { PRODUCT_NAME } from "./utils/keys";
import { search } from "./endpoints/apiEndpoints";

export const fullEcommerceSimulation = simulation((setUp) => {
  const httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")
    .userAgentHeader(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
    );

  const scn = scenario("Full E-Commerce User Journey")
    .exec(group("Anonymous Browsing").on(
      homeAnonymous,
      pause(minPauseSec, maxPauseSec)
    ))
    .exec(feed(productsFeeder))
    .exec((session: Session) => {
      try {
        return session.set(PRODUCT_NAME, session.get("ProductName"));
      } catch (error) {
        console.error("Error setting product name:", error);
        return session;
      }
    })
    .exec(group("Anonymous Search").on(
      search,
      pause(minPauseSec, maxPauseSec)
    ))
    .exec(group("Authenticate").on(
      authenticate,
      pause(minPauseSec, maxPauseSec)
    ))
    .exec(group("Authenticated Browsing").on(
      homeAuthenticated,
      pause(minPauseSec, maxPauseSec)
    ))
    .exec(group("Add To Cart").on(
      addToCart,
      pause(minPauseSec, maxPauseSec)
    ))
    .exec(group("Checkout").on(
      buy,
      pause(minPauseSec, maxPauseSec)
    ));

  const userInjection = scn.injectOpen(
    nothingFor(2),
    atOnceUsers(2),
    rampUsersPerSec(1).to(5).during(10),
    constantUsersPerSec(3).during(20)
  );

  const testAssertions = [
    global().responseTime().max().lt(3000),
    global().successfulRequests().percent().gt(99)
  ];

  setUp(userInjection)
    .assertions(...testAssertions)
    .protocols(httpProtocol);
});

export default fullEcommerceSimulation;
