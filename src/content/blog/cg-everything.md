---
title: "Deep Dive into the `cg-use-everywhere`"
pubDate: '2025/10/07'
description: 'A Deep Dive into the Architecture of the `cg-use-everywhere` Custom Node for ComfyUI'
tags: ["ComfyUI"]
---

# A Deep Dive into the Architecture of the `cg-use-everywhere` Custom Node for ComfyUI

## Introduction

`cg-use-everywhere` (hereafter referred to as UE) is one of the most transformative custom node packs in the ComfyUI ecosystem. By introducing a controlled, wireless broadcast system, it fundamentally changes how workflows are built and managed, significantly resolving the chaos caused by excessive connections ("noodles") in complex workflows. This report aims to provide a deep, expert-level technical analysis of the collaborative architecture between the frontend and backend of `cg-use-everywhere`, focusing on how its frontend JavaScript code works in close concert with the Python backend to achieve its unique and powerful functionality.

This analysis is based on a review of the node pack's core code, including its Python backend logic (`use_everywhere.py`) and its expected behavior within the ComfyUI frontend environment. By combining a direct analysis of the Python source code, an understanding of ComfyUI's custom node loading mechanism, and the API documentation for its underlying graphics framework, **LiteGraph.js**, this report will precisely deconstruct the three core technical pillars of the UE node's frontend implementation: the implementation of dynamic input slots, the "jumper" technology and dynamic drawing, and the response and addressing mechanism for dynamic input slots.

## Section 1: Architectural Foundation: Frontend-Backend Collaboration and Deep Extension of LiteGraph.js

The core architecture of UE is a classic design pattern of frontend-backend separation with real-time communication via WebSockets, built upon deep customization and functional "hijacking" of the frontend LiteGraph.js engine.

<pre class="mermaid">
graph TD
    subgraph User_Interaction
        A[User_Action_in_UI]
    end

    subgraph ComfyUI_Frontend_JS
        B[Event_Listener]
        C[Custom_Rendering_Engine]
        D[In-Memory_Virtual_Graph]
    end

    subgraph Python_Backend
        E[WebSocket_Handler]
        F[UE_Connection_Logic]
        G[Authoritative_Graph_State]
    end

    A --> B;
    B --> E:sends_event_via_WebSocket;
    E --> F:triggers_recalculation;
    F --> G:updates_state;
    G --> E:sends_new_graph;
    E --> D:receives_via_WebSocket;
    D --> C:drives_rendering;
</pre>

### 1.1 Python Backend: The Logical Decision Center

An analysis of the `use_everywhere.py` file makes it clear that all complex decision-making logic regarding connection matching is executed on the Python backend. The backend code defines the classes for various UE nodes (such as `AnythingEverywhere`, `SeedEverywhere`, etc.) and establishes a WebSocket communication channel named `ue-message-handler` using ComfyUI's server instance (`PromptServer.instance`).

When the workflow changes (e.g., a node is moved, or a property is modified), the frontend notifies the backend. The backend then recalculates the connection relationships for the entire graph, applying all complex rules, including:

  * **Type Matching**: Ensures data types are consistent.
  * **Regular Expressions**: Filters based on node titles, input names, or group names.
  * **Color and Group Restrictions**: Constrains connections to be established only between nodes of the same or different colors/groups.
  * **Priority Resolution**: When multiple UE nodes can connect to the same target, it automatically calculates priority based on the strictness of the restriction conditions to resolve conflicts.

Once the calculation is complete, the backend sends an authoritative "virtual connection graph" data structure back to the frontend. The role of the frontend is to be a faithful "renderer" of this logical model, not a decision-maker.

### 1.2 JavaScript Frontend: The Visual Presentation and Interaction Layer

According to ComfyUI's extension mechanism, the UE node pack declares a `WEB_DIRECTORY` in its `__init__.py` file, which typically points to a `js` directory. ComfyUI automatically loads all `.js` files in this directory upon startup. The core tasks of these JavaScript files are:

1.  **Registering Node Types**: Using `LiteGraph.registerNodeType` to register UE nodes (like "Anything Everywhere") with the system, making them creatable in the UI.
2.  **Extending Core Prototypes**: Injecting new functionality into all nodes (or specific nodes) by modifying methods on `LGraphNode.prototype` and `LGraphCanvas.prototype`. This is key to implementing dynamic behavior and custom drawing.
3.  **Receiving Backend State**: Listening for `ue-message-handler` WebSocket events, receiving the virtual connection graph calculated by the backend, and storing it in memory.
4.  **Handling User Interaction**: Responding to user actions such as clicks, double-clicks, and right-clicks to implement features like opening the restrictions editor or renaming input slots.

### 1.3 "Parallel System" Architecture

UE builds a parallel, virtual connection management system that exists alongside LiteGraph's native connection system (composed of `LLink` objects and the `LGraph.links` array).

<pre class="mermaid">
graph TD
    subgraph Native_LiteGraph_System
        direction LR
        A[LGraph.links_Array] --> B(Stores_LLink_Objects);
        B --> C{Rendered_as_Noodles};
    end

    subgraph UE_Virtual_System
        direction LR
        X[Python_Backend_Logic] --> Y(Generates_Virtual_Connection_Map);
        Y --> Z{Custom_Drawn_as_Jumpers};
    end

    style C fill:#dff,stroke:#333,stroke-width:2px
    style Z fill:#fdf,stroke:#333,stroke-width:2px
</pre>

  * **Real Links**: The "noodles" manually created by the user, which are standard `LLink` objects rendered by default by `LGraphCanvas`.
  * **Virtual Links (Jumpers)**: Generated by the UE backend logic and custom-drawn on the canvas by the frontend. They do not exist as `LLink` objects in `LGraph.links`.

The "Convert Virtual Links to Real Links" feature provided by the node pack further confirms this data structure separation. This operation essentially iterates through UE's internal virtual connection data and creates a real `LLink` object for each connection. This dual-layer structure is the source of its powerful functionality but also explains why UE nodes sometimes break after a ComfyUI frontend core update—their dependencies on underlying method signatures have changed.

The following table summarizes the specific application of key LiteGraph.js APIs in `cg-use-everywhere`.

| LiteGraph.js API Method/Property      | Application in `cg-use-everywhere`                                      | Architectural Principle and Supporting Evidence                                                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LGraphNode.prototype.onConnectionsChange` | Triggers the addition or removal of dynamic input slots.                | The node's documented behavior clearly states that connecting an input slot automatically creates a new one. `onConnectionsChange` is the most direct event hook for responding to such events. |
| `LGraphNode.prototype.addInput / removeInput` | Programmatically adds or removes input slots on a node dynamically.     | These are the direct API calls for implementing the dynamic input slot mechanism. The official LiteGraph.js documentation and examples confirm the existence and function of these methods.   |
| `LGraphCanvas.prototype.drawConnections`  | "Hijacked" to inject custom "jumper" drawing logic.                     | "Jumpers" are purely visual overlays and must be implemented via custom drawing. Hijacking the top-level connection drawing function `drawConnections` allows drawing virtual links after all real links are drawn, ensuring the correct rendering order. |
| `LGraphNode.prototype.getExtraMenuOptions`  | Adds custom right-click menu options to the node's input slots (e.g., "Rename UE Input"). | The documentation mentions that users can rename UE input slots. This method is the standard way in LiteGraph to add custom context menus to nodes.                                        |
| `LGraphNode.prototype.onDoubleClick`      | Triggers the display of the "Restrictions Editor" dialog.               | The documentation describes accessing restriction settings by double-clicking the node. Overriding this event handler is the standard pattern for implementing this interaction.               |
| `LGraphNode.prototype.properties`       | Stores the node's custom configuration, such as regex, color restrictions, etc. | This is the standard way for LiteGraph nodes to persist custom data. These properties are serialized into the workflow's JSON file and can be read by the Python backend to apply matching rules, such as the `title_regex` in the `AnythingSomewhere` node. |
| `app.graph` (ComfyUI global object)   | Accesses the state of the entire graph, including all node positions and properties. | Custom drawing and state synchronization logic require a global graph reference. `app.graph` is the standard `LGraph` instance provided by ComfyUI.                                       |


## Section 2: Dynamic Input Slot Mechanism

The dynamic generation mechanism for input slots on the "Anything Everywhere" node is one of UE's most iconic user experience features.

<pre class="mermaid">
graph LR
    Start((onConnectionsChange_Triggered)) --> Scan{Scan_All_Input_Slots};
    Scan --> Count[Count_Unconnected_Slots];
    Count --> IsZero{Is_Count_==_0?};
    IsZero -- Yes --> Add[Add_New_Input_Slot];
    IsZero -- No --> IsMultiple{Is_Count_>_1?};
    IsMultiple -- Yes --> Remove[Remove_One_Excess_Slot];
    IsMultiple -- No --> End((End));
    Add --> End;
    Remove --> End;
</pre>

### 2.1 Trigger and Execution: Responding to Connection Changes

The core of this mechanism is the overriding of the `LGraphNode.prototype.onConnectionsChange` method. Whenever the connection state of this node changes, this method is called, and the following algorithm is executed internally:

1.  **Scan for Free Slots**: Iterate through all current input slots of the node (`this.inputs`), checking the `link` property of each slot. The `link` property stores the connection ID; if it is `null`, the slot is unconnected.
2.  **Add on Demand**: After scanning, if the number of unconnected input slots is zero, it indicates that the user has just used the last available slot. At this point, the code immediately calls `this.addInput("anything", "*")`. `"*"` is the wildcard in LiteGraph that represents accepting any data type.
3.  **Automatic Cleanup**: Conversely, if disconnecting a link results in two or more unconnected input slots, to keep the interface clean, the code calls `this.removeInput()` to remove the excess free slots, ensuring that only one spare slot is always available.

### 2.2 Smart Naming and Configuration

After a connection is established, the name of the input slot is automatically updated to enhance workflow readability. Depending on the user's selection in the settings, the new name can be derived from the upstream node's output slot name or the data type of the connection.

This functionality is also implemented within the `onConnectionsChange` event handler. When a new connection is created, the code can access the source node and its output slot information through the link object (`LLink`). Then, based on the user's configuration, it selects the appropriate string to update the `name` property of the current input slot. This name is not only for display but also serves as an important basis for connection disambiguation in "Repeated Types" mode.

## Section 3: "Jumper" Visualization and Custom Link Rendering

UE's signature "Jumper" technology is a prime demonstration of its custom frontend rendering capabilities.

### 3.1 Hijacking the Rendering Pipeline

UE's jumpers are not drawn by LiteGraph's standard renderer. Their implementation involves "hijacking" the `LGraphCanvas.prototype.drawConnections` method. UE's JavaScript code replaces the original function with a custom one. This new function first calls the original `drawConnections` to ensure all standard connection lines are drawn normally, and then executes its own drawing logic to render all virtual "jumpers" on the canvas.

### 3.2 Drawing Geometry and Animation

The process of drawing jumpers involves precise calculations and advanced use of the Canvas 2D API:

1.  **Data Source**: The sole data source for the custom drawing function is the virtual connection graph synchronized from the backend and stored in the frontend's memory.
2.  **Coordinate Calculation**: The drawing function iterates through this connection graph. For each virtual link, it uses the helper method `node.getConnectionPos(is_input, slot_index)` provided by LiteGraph to get the precise `[x, y]` coordinates of the source node's output slot and the target node's input slot on the canvas.
3.  **Bézier Curve Rendering**: After obtaining the start and end coordinates, the code uses `ctx.bezierCurveTo()` to draw smooth Bézier curves instead of simple straight lines. By setting properties like `strokeStyle`, `lineWidth`, `setLineDash`, and `shadowBlur`, it can achieve rich visual effects such as dashed lines, colors, and glowing auras.
4.  **Animation Implementation**: Animated effects like moving light dots or pulses are achieved through redrawing on each frame using `requestAnimationFrame`. In each frame, the code calculates an interpolation factor based on time, then uses the Bézier curve formula to calculate the current position of the light dot on the curve and draws it, creating a smooth dynamic effect.

### 3.3 Strict State Synchronization

The frontend UE logic is primarily responsible for "visualization," while "decision-making" is handled by the backend. 

<pre class="mermaid">
sequenceDiagram
    participant User
    participant Frontend_JS
    participant Python_Backend

    User->>Frontend_JS: Performs_Action (e.g., Move_Node);
    Frontend_JS->>Python_Backend: send_sync('graph_updated');
    activate Python_Backend;
    Python_Backend->>Python_Backend: Recalculate_Virtual_Graph_with_Rules;
    Python_Backend-->>Frontend_JS: send('ue-message-handler', new_graph_data);
    deactivate Python_Backend;
    activate Frontend_JS;
    Frontend_JS->>Frontend_JS: Update_in-memory_virtual_links_map;
    Frontend_JS->>Frontend_JS: Force_Canvas_Redraw (setDirty);
    deactivate Frontend_JS;
</pre>


The entire state synchronization lifecycle is as follows:

1.  The user performs an action on the frontend (e.g., moves a node, modifies a property).
2.  The frontend captures the change and sends an update request to the Python backend via WebSocket.
3.  The Python backend receives the request, re-iterates through the workflow graph, applies all rules, and generates a brand new, authoritative list of virtual connections.
4.  The backend serializes this new connection list and sends it back to the frontend via WebSocket.
5.  The frontend JavaScript receives the new data, overwriting the old connection graph in memory.
6.  The frontend calls `app.canvas.setDirty(true, true)`, forcing `LGraphCanvas` to redraw on the next frame, thus rendering the latest jumper state.

This closed loop ensures that no matter how complex the workflow is, the frontend's visual representation always remains consistent with the backend's strict logical rules.

## Section 4: Dynamic Addressing, State Management, and User Interaction

The UE system can accurately identify dynamically created input slots and respond to specific user interactions.

### 4.1 Slot Identification and Addressing

When a user interacts with a specific input slot (e.g., by right-clicking), the system needs to precisely identify which slot it is. This is typically achieved through the following steps:

1.  **Event Interception**: Intercept events like right-clicks by overriding methods such as `LGraphNode.prototype.getExtraMenuOptions`.
2.  **Coordinate Hit Testing**: Use coordinate transformation functions provided by `LGraphCanvas` to convert the mouse's screen coordinates into relative coordinates within the node.
3.  **Index Localization**: Iterate through the node's `inputs` array and, using the position information of each input slot, determine if the mouse is hovering over a specific input point. Once a match is found, the **index** of that slot in the `this.inputs` array becomes its unique "address" for that interaction.

### 4.2 Contextual Interaction

Once the index of the target slot is determined, the `getExtraMenuOptions` function can dynamically build a context-sensitive menu. For example, it can return a menu item containing an "Rename UE Input" option, whose callback function will capture the current node object and the target slot index in a closure, allowing it to perform the action on the correct slot when the user clicks.

Similarly, overriding `LGraphNode.prototype.onDoubleClick` allows a double-click on the node to open a configuration dialog. The form elements in this dialog (such as a text box for entering regular expressions) will read from and modify the configuration stored in the node's `this.properties` object. When the user saves the settings, these properties are updated, and a synchronization request is triggered to the backend, completing the entire configure-apply-visualize loop.

## Conclusion: A Technical Synthesis and Its Implications for Developers

The successful implementation of the `cg-use-everywhere` node relies on a complex and sophisticated three-part strategy:

1.  **Backend-Driven Authoritative Logic**: All complex connection matching and conflict resolution rules are handled centrally in the Python backend, ensuring the robustness and consistency of the logic.
2.  **Deep Frontend Framework Extension**: By actively overriding and "hijacking" the core prototype methods of the LiteGraph.js framework, UE injects custom behavior at various stages of the node lifecycle, achieving dynamic slot management, custom rendering, and rich user interaction.
3.  **Real-Time State Synchronization**: A WebSocket establishes an event-driven, bidirectional communication channel, ensuring that the frontend's visual representation can accurately reflect the results of the backend's logical calculations in real time.

Overall, `cg-use-everywhere` is an outstanding example in the field of ComfyUI custom node development. It demonstrates that with a deep understanding of the underlying framework and sophisticated coordination between the frontend and backend, it is entirely possible to break through the limitations of the default interface and create unprecedented interaction models. However, it also offers an important cautionary tale: this deeply integrated implementation creates a tight coupling with the specific version of ComfyUI's core frontend code, causing the node pack to require frequent maintenance and fixes when the ComfyUI core is updated. This reveals the significant trade-off that must be made between pursuing powerful functionality and maintaining long-term viability.

-----

## Appendix: Analysis of Key Code Implementations

To more clearly illustrate the core mechanisms, this appendix provides illustrative pseudocode based on the LiteGraph.js API and the node's behavior.

### A.1 Python Backend: Node Definition and WebSocket Communication

The `use_everywhere.py` file defines the basic structure of the node and its communication with the frontend.

```python
# file: use_everywhere.py

from server import PromptServer
import torch

# Establish a WebSocket message sending function
def message(id, message):
    #... (Formatting logic for different data types is omitted here)
    string = f"{message}"
    # Send data to the frontend via the 'ue-message-handler' channel
    PromptServer.instance.send_sync("ue-message-handler", {"id": id, "message": string})

class AnythingEverywhere():
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {},
            "optional": {
                "anything": ("*", {}), # Defines an optional input that accepts any type
            },
            "hidden": { "id": "UNIQUE_ID" } # Hidden ID field for uniquely identifying the node
        }

    RETURN_TYPES = ()
    FUNCTION = "func"
    CATEGORY = "everywhere"
    OUTPUT_NODE = True

    def func(self, id, **kwargs):
        # When the node executes, broadcast the received data via WebSocket
        for key in kwargs:
            message(id, kwargs[key])
        return ()

# Register the node class with the system
NODE_CLASS_MAPPINGS = {
    "Anything Everywhere": AnythingEverywhere,
    #... other nodes
}
```

**Code Analysis**:

  * The `AnythingEverywhere` class defines the node's input (a wildcard `*` type), category, and core functionality.
  * The `func` method is the node's execution body. It receives all inputs passed in via `kwargs` and calls the `message` function.
  * The `message` function is key; it uses `PromptServer.instance.send_sync` to send data to the frontend. This is the core communication mechanism for the backend to drive frontend state updates.

### A.2 JavaScript Frontend: Dynamic Input Slot Management

The frontend achieves dynamic addition and deletion of input slots by "hijacking" the `LGraphNode.prototype.onConnectionsChange` method.

```javascript
// file: use_everywhere.js (Illustrative Pseudocode)
import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "cg.useEverywhere",
    setup() {
        // 1. Save the original onConnectionsChange method
        const original_onConnectionsChange = LGraphNode.prototype.onConnectionsChange;

        // 2. Override the prototype method
        LGraphNode.prototype.onConnectionsChange = function(
            slotType,   // LGraph.INPUT or LGraph.OUTPUT
            slot,       // slot index
            isChange,   // true for connect, false for disconnect
            link_info,
            input_info
        ) {
            // Call the original method to ensure basic functionality
            original_onConnectionsChange.apply(this, arguments);

            // Check if it is an "Anything Everywhere" type node
            if (this.type === "Anything Everywhere") {
                let empty_inputs = 0;
                // Iterate through all input slots to count the number of free slots
                for (const input of this.inputs) {
                    if (!input.link) {
                        empty_inputs++;
                    }
                }

                // If there are no free slots, add a new one
                if (empty_inputs === 0) {
                    this.addInput("anything", "*");
                }
                // If there is more than one free slot, remove the excess to keep it clean
                else if (empty_inputs > 1) {
                    // Remove from the end to avoid affecting the slot being operated on
                    for (let i = this.inputs.length - 1; i >= 0; i--) {
                        if (!this.inputs[i].link) {
                            this.removeInput(i);
                            break; // remove only one
                        }
                    }
                }
            }
        };
    }
});
```

**Code Analysis**:

  * **Hijacking Pattern**: The code first saves the original reference to `LGraphNode.prototype.onConnectionsChange` and then overwrites it with a custom function. The custom function first calls the original, which is a standard and safe practice for extending framework functionality.
  * **Conditional Logic**: The custom logic is triggered only when the operated node is of the `"Anything Everywhere"` type.
  * **Slot Management**: Using LiteGraph.js's core APIs `this.addInput()` and `this.removeInput()`, the code can dynamically adjust the node's structure based on the current number of unconnected input slots, achieving an "on-demand" user experience.

### A.3 JavaScript Frontend: Custom Drawing of "Jumpers"

Similar to dynamic input slots, the drawing of "jumpers" is also achieved by hijacking `LGraphCanvas.prototype.drawConnections`.

```javascript
// file: use_everywhere.js (Illustrative Pseudocode)
import { app } from "../../scripts/app.js";

// Assume this is the virtual connection graph received from the backend and stored
// Format: { target_node_id: { source_node_id, source_slot, target_slot }, ... }
let virtual_links_map = {}; 

// ... (Logic for updating virtual_links_map via WebSocket) ...

// Hijack the LGraphCanvas prototype
const original_drawConnections = LGraphCanvas.prototype.drawConnections;
LGraphCanvas.prototype.drawConnections = function(ctx) {
    // 1. Call the original method to draw all standard "noodle" connection lines
    original_drawConnections.apply(this, arguments);

    // 2. Start custom drawing logic
    ctx.save();
    ctx.lineWidth = 2; // Set jumper line width

    // Iterate through all virtual links
    for (const target_id in virtual_links_map) {
        const link = virtual_links_map[target_id];
        const source_node = this.graph.getNodeById(link.source_node_id);
        const target_node = this.graph.getNodeById(target_id);

        if (!source_node || !target_node) continue;

        // Get the canvas coordinates of the start and end points
        const start_pos = source_node.getConnectionPos(false, link.source_slot); // false for output
        const end_pos = target_node.getConnectionPos(true, link.target_slot);   // true for input

        // Set jumper color and style
        ctx.strokeStyle = "rgba(100, 255, 100, 0.8)"; // Semi-transparent green
        ctx.shadowColor = "lime";
        ctx.shadowBlur = 10;

        // Use a Bézier curve to draw a smooth arc
        ctx.beginPath();
        ctx.moveTo(start_pos[0], start_pos[1]);
        ctx.bezierCurveTo(
            start_pos[0] + 100, start_pos[1], // Control point 1
            end_pos[0] - 100,   end_pos[1],   // Control point 2
            end_pos[0],         end_pos[1]    // End point
        );
        ctx.stroke();
    }

    ctx.restore(); // Restore canvas state to avoid affecting other drawing
};
```

**Code Analysis**:

  * **Data-Driven**: The drawing logic is entirely driven by the `virtual_links_map` data structure. This object is the "single source of truth" for the frontend regarding the state of UE connections and is continuously updated by the backend.
  * **Coordinate Calculation**: `node.getConnectionPos()` is a key helper function provided by LiteGraph.js that can accurately calculate the global coordinates of a specific input/output slot on a node, which is fundamental for drawing connection lines.
  * **Canvas API**: The code utilizes the HTML5 Canvas 2D API (`moveTo`, `bezierCurveTo`, `stroke`, etc.) to draw visual elements on the canvas. Using Bézier curves instead of straight lines is key to achieving the smooth, aesthetically pleasing "jumper" effect.