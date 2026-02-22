import asyncio

from httpx import AsyncClient


async def run():
    async with AsyncClient(base_url="http://localhost:8000") as client:
        resp = await client.post("/auth/dev/login/bmx")
        cookies = resp.cookies

        # Get active session
        resp = await client.get("/api/sessions/active", cookies=cookies)
        print("Active Session Data:", resp.status_code, resp.json())


if __name__ == "__main__":
    asyncio.run(run())
