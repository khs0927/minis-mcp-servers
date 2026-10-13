import os
from typing import Literal
from mcp.server.fastmcp import FastMCP
from engine import render, validate_svg
mcp=FastMCP("Diagram Design Mobile",host="0.0.0.0",port=int(os.getenv("PORT","8000")),stateless_http=True,json_response=True)

@mcp.tool()
def diagram_status()->dict:
    """Check whether Diagram Design Mobile is operational and list its supported tools."""
    return {"ok":True,"version":"0.1.0","tools":["diagram_render","diagram_validate_svg"],"formats":["HTML","SVG"],"storage":"none"}

@mcp.tool()
def diagram_render(title:str,nodes:list[dict],edges:list[dict],direction:Literal["LR","TB"]="LR",subtitle:str="")->dict:
    """Render a mobile-readable offline architecture/flow/data diagram. Nodes are {id,label,emphasis?}; edges are {from,to,label?}; returns self-contained HTML plus SVG. Maximum 24 nodes and 48 edges. ASCII IDs and Korean labels supported."""
    return render(title,nodes,edges,direction,subtitle)

@mcp.tool()
def diagram_validate_svg(svg:str)->dict:
    """Validate SVG XML and reject active or external content."""
    return validate_svg(svg)

if __name__=="__main__":mcp.run(transport="streamable-http")
