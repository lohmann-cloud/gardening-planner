package de.gardenplanner.resource;

import de.gardenplanner.auth.AccessControl;
import de.gardenplanner.dto.FeedbackDto;
import de.gardenplanner.dto.FeedbackPatchRequest;
import de.gardenplanner.dto.FeedbackRequest;
import de.gardenplanner.entity.Feedback;
import de.gardenplanner.entity.User;
import de.gardenplanner.model.FeedbackPriority;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

@Path("/feedback")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class FeedbackResource {

    @Inject
    AccessControl access;

    @GET
    public List<FeedbackDto> list() {
        access.requireAuth();
        return Feedback.findAllSorted().stream()
                .map(FeedbackDto::from)
                .toList();
    }

    @POST
    @Transactional
    public FeedbackDto create(@Valid FeedbackRequest req) {
        User user = access.requireAuth();
        Feedback f = new Feedback();
        f.user = user;
        f.message = req.message.trim();
        f.priority = req.priority != null ? req.priority : FeedbackPriority.MEDIUM;
        f.persist();
        return FeedbackDto.from(f);
    }

    @PATCH
    @Path("/{id}")
    @Transactional
    public FeedbackDto patch(@PathParam("id") UUID id, FeedbackPatchRequest req) {
        access.requireAuth();
        Feedback f = Feedback.findById(id);
        if (f == null) throw new NotFoundException("Feedback not found");
        if (req.done != null) f.done = req.done;
        f.persist();
        return FeedbackDto.from(f);
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response remove(@PathParam("id") UUID id) {
        User user = access.requireAuth();
        Feedback f = Feedback.findById(id);
        if (f == null) throw new NotFoundException("Feedback not found");
        if (!f.user.id.equals(user.id)) {
            throw new ForbiddenException("Only the author can delete this feedback");
        }
        f.delete();
        return Response.noContent().build();
    }
}
