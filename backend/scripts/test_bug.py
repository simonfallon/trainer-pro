import asyncio

from httpx import AsyncClient


async def run():
    async with AsyncClient(base_url="http://localhost:8000") as client:
        # Dev login to get the cookie
        resp = await client.post("/auth/dev/login/bmx")
        print("Login:", resp.status_code, resp.json())
        cookies = resp.cookies

        # Get clients
        resp = await client.get("/api/clients?trainer_id=1", cookies=cookies)
        clients = resp.json()
        print("Clients:", [c["id"] for c in clients])

        # Select first two clients
        client_ids = [c["id"] for c in clients][:2]

        # Start active session
        resp = await client.post(
            "/api/sessions/active/start",
            json={"client_ids": client_ids, "duration_minutes": 60},
            cookies=cookies,
        )
        print("Start Active:", resp.status_code, resp.json())

        # Get active session
        resp = await client.get("/api/sessions/active", cookies=cookies)
        print("Get Active:", resp.status_code)
        active = resp.json()
        print(f"Is Group? {'sessions' in active}")
        print("Active Session Data:", active)

        # Cleanup
        if "sessions" in active:
            for s in active["sessions"]:
                await client.put(
                    f"/api/sessions/{s['id']}", json={"status": "completed"}, cookies=cookies
                )
        else:
            await client.put(
                f"/api/sessions/{active['id']}", json={"status": "completed"}, cookies=cookies
            )


if __name__ == "__main__":
    asyncio.run(run())
