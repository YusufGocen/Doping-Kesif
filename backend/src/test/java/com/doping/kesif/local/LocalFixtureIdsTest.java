package com.doping.kesif.local;
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
class LocalFixtureIdsTest {
 @Test void keepsPersistedDemoIdsStableAcrossBrandChanges() {
  assertEquals("0bc6df95-5b15-34e2-9e74-1f53304c14d0", LocalFixtureIds.demo("user:yusuf").toString());
  assertEquals("f2161ff0-33b4-320b-987d-15e38d2c6b65", LocalDemoSeeder.MATH_ID.toString());
 }
 @Test void keepsPersistedContentIdsStableAcrossBrandChanges() {
  assertEquals("b939457f-6192-3986-a919-fcbee2778c1e", LocalFixtureIds.content("topic:MATEMATIK_5").toString());
 }
}
