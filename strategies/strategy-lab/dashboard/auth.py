"""Minimal password gate for the dashboard (it is reachable from the internet)."""
from __future__ import annotations

import hmac
import os

import streamlit as st


def require_password() -> None:
    expected = os.environ.get("DASHBOARD_PASSWORD", "")
    if not expected:
        st.error("DASHBOARD_PASSWORD is not set in .env; the dashboard is locked.")
        st.stop()
    if st.session_state.get("authed"):
        return
    with st.form("login"):
        pw = st.text_input("Password", type="password")
        ok = st.form_submit_button("Enter")
    if ok and hmac.compare_digest(pw.encode(), expected.encode()):
        st.session_state["authed"] = True
        st.rerun()
    elif ok:
        st.error("Wrong password")
    st.stop()
